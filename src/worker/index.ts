/**
 * Cloudflare Worker entry point.
 *
 *   /auth/*   Google sign-in (OAuth code flow + PKCE), session cookie
 *   /api/*    JSON API: load/save the user's Google Sheet, calendar feed token
 *   /ics/*    Subscribable iCalendar feed (reminders as VALARMs)
 *   *         Static SPA assets (served by the assets binding, see wrangler.jsonc)
 */
import type { AppEnv, UserRecord } from './env';
import { encrypt, randomToken } from './crypto';
import { accessTokenFor, authorizationUrl, decodeIdToken, exchangeCode, GoogleAuthError, pkceVerifier, revoke } from './google';
import { createSpreadsheet, ensureTabs, readTables, SheetsError, writeTables } from './sheets';
import { fromTables, validateTables } from '../shared/schema';
import { buildCalendarFile } from '../shared/ics';

const SESSION_COOKIE = 'fc_session';
const OAUTH_COOKIE = 'fc_oauth';
const SESSION_TTL = 60 * 60 * 24 * 30; // 30 days

export default {
  async fetch(request: Request, env: AppEnv): Promise<Response> {
    const url = new URL(request.url);
    try {
      const res = await route(request, env, url);
      return withSecurityHeaders(res);
    } catch (err) {
      if (err instanceof HttpError) return withSecurityHeaders(json({ error: err.message }, err.status));
      if (err instanceof GoogleAuthError) return withSecurityHeaders(json({ error: 'google_auth', detail: err.message }, err.status));
      if (err instanceof SheetsError) return withSecurityHeaders(json({ error: 'sheets', detail: err.message }, err.status === 401 ? 401 : 502));
      console.error(err);
      return withSecurityHeaders(json({ error: 'internal' }, 500));
    }
  },
} satisfies ExportedHandler<AppEnv>;

class HttpError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message);
  }
}

async function route(request: Request, env: AppEnv, url: URL): Promise<Response> {
  const { pathname } = url;
  const method = request.method;

  if (pathname === '/api/health') return json({ ok: true, configured: isConfigured(env) });

  // ---------------------------------------------------------------- auth
  if (pathname === '/auth/login' && method === 'GET') {
    requireConfigured(env);
    const state = randomToken(16);
    const verifier = pkceVerifier();
    const location = await authorizationUrl(env, state, verifier);
    return redirect(location, [cookie(env, OAUTH_COOKIE, `${state}.${verifier}`, 600, '/auth')]);
  }

  if (pathname === '/auth/callback' && method === 'GET') {
    requireConfigured(env);
    const oauth = readCookie(request, OAUTH_COOKIE);
    const [state, verifier] = (oauth ?? '').split('.');
    const clear = cookie(env, OAUTH_COOKIE, '', 0, '/auth');
    if (url.searchParams.get('error')) return redirect(`/#/settings?login=${encodeURIComponent(url.searchParams.get('error')!)}`, [clear]);
    if (!state || state !== url.searchParams.get('state')) return redirect('/#/settings?login=state_mismatch', [clear]);
    const code = url.searchParams.get('code');
    if (!code) return redirect('/#/settings?login=missing_code', [clear]);

    const tokens = await exchangeCode(env, code, verifier);
    if (!tokens.id_token) throw new GoogleAuthError('no id_token');
    const claims = decodeIdToken(env, tokens.id_token);
    const existing = await getUser(env, claims.sub);
    if (!tokens.refresh_token && !existing) throw new GoogleAuthError('no refresh_token returned');
    const user: UserRecord = {
      sub: claims.sub,
      email: claims.email,
      name: claims.name ?? claims.email,
      picture: claims.picture,
      refreshToken: tokens.refresh_token ? await encrypt(tokens.refresh_token, env.TOKEN_ENCRYPTION_KEY) : existing!.refreshToken,
      spreadsheetId: existing?.spreadsheetId,
      feedToken: existing?.feedToken,
      createdAt: existing?.createdAt ?? new Date().toISOString(),
    };
    await putUser(env, user);
    await env.KV.put(`atok:${user.sub}`, tokens.access_token, { expirationTtl: Math.max(60, tokens.expires_in - 120) });
    const session = randomToken(32);
    await env.KV.put(`sess:${session}`, user.sub, { expirationTtl: SESSION_TTL });
    return redirect('/#/settings?login=ok', [clear, cookie(env, SESSION_COOKIE, session, SESSION_TTL, '/')]);
  }

  if (pathname === '/auth/me' && method === 'GET') {
    const user = await sessionUser(request, env);
    if (!user) return json({ user: null, configured: isConfigured(env) });
    return json({
      configured: true,
      user: { email: user.email, name: user.name, picture: user.picture },
      spreadsheetUrl: user.spreadsheetId ? `https://docs.google.com/spreadsheets/d/${user.spreadsheetId}/edit` : null,
      feedUrl: user.feedToken ? feedUrl(env, user.feedToken) : null,
    });
  }

  if (pathname === '/auth/logout' && method === 'POST') {
    checkCsrf(request, env);
    const token = readCookie(request, SESSION_COOKIE);
    const user = await sessionUser(request, env);
    if (token) await env.KV.delete(`sess:${token}`);
    if (user && url.searchParams.get('revoke') === '1') {
      // Disconnect completely: revoke Google access and forget the user (the Sheet itself stays in their Drive).
      try {
        await revoke(await accessTokenFor(env, user));
      } catch {
        /* already revoked */
      }
      if (user.feedToken) await env.KV.delete(`feed:${user.feedToken}`);
      await env.KV.delete(`user:${user.sub}`);
      await env.KV.delete(`atok:${user.sub}`);
    }
    return json({ ok: true }, 200, [cookie(env, SESSION_COOKIE, '', 0, '/')]);
  }

  // ---------------------------------------------------------------- data API
  if (pathname === '/api/data') {
    const user = await requireUser(request, env);
    const token = await accessTokenFor(env, user);
    if (method === 'GET') {
      const { spreadsheetId, spreadsheetUrl } = await ensureSpreadsheet(env, user, token);
      const tables = await readTables(token, spreadsheetId);
      return json({ tables, spreadsheetId, spreadsheetUrl });
    }
    if (method === 'PUT') {
      checkCsrf(request, env);
      const body = (await request.json().catch(() => null)) as { tables?: unknown } | null;
      let tables;
      try {
        tables = validateTables(body?.tables);
      } catch (e) {
        throw new HttpError(400, (e as Error).message);
      }
      const { spreadsheetId, spreadsheetUrl } = await ensureSpreadsheet(env, user, token);
      await writeTables(token, spreadsheetId, tables);
      return json({ ok: true, spreadsheetId, spreadsheetUrl, savedAt: new Date().toISOString() });
    }
    throw new HttpError(405, 'method not allowed');
  }

  if (pathname === '/api/feed') {
    const user = await requireUser(request, env);
    checkCsrf(request, env);
    if (method === 'POST') {
      if (user.feedToken) await env.KV.delete(`feed:${user.feedToken}`);
      user.feedToken = randomToken(24);
      await env.KV.put(`feed:${user.feedToken}`, user.sub);
      await putUser(env, user);
      return json({ feedUrl: feedUrl(env, user.feedToken) });
    }
    if (method === 'DELETE') {
      if (user.feedToken) await env.KV.delete(`feed:${user.feedToken}`);
      user.feedToken = undefined;
      await putUser(env, user);
      return json({ ok: true });
    }
    throw new HttpError(405, 'method not allowed');
  }

  // ---------------------------------------------------------------- calendar feed
  const feedMatch = pathname.match(/^\/ics\/([A-Za-z0-9_-]{20,})\.ics$/);
  if (feedMatch && method === 'GET') {
    const sub = await env.KV.get(`feed:${feedMatch[1]}`);
    const user = sub ? await getUser(env, sub) : null;
    if (!user || user.feedToken !== feedMatch[1] || !user.spreadsheetId) return new Response('Not found', { status: 404 });
    const token = await accessTokenFor(env, user);
    const data = fromTables(await readTables(token, user.spreadsheetId));
    const ics = buildCalendarFile(data, { ...data.settings.feed, years: 1 });
    return new Response(ics, {
      headers: {
        'content-type': 'text/calendar; charset=utf-8',
        'cache-control': 'private, max-age=3600',
        'content-disposition': 'inline; filename="family-calendar.ics"',
      },
    });
  }

  if (pathname.startsWith('/api/') || pathname.startsWith('/auth/') || pathname.startsWith('/ics/')) {
    throw new HttpError(404, 'not found');
  }
  return env.ASSETS.fetch(request);
}

// ---------------------------------------------------------------- helpers

function isConfigured(env: AppEnv): boolean {
  return Boolean(env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET && env.TOKEN_ENCRYPTION_KEY);
}

function requireConfigured(env: AppEnv): void {
  if (!isConfigured(env)) throw new HttpError(503, 'Google sign-in is not configured on this server (see README → Google Cloud setup).');
}

async function ensureSpreadsheet(env: AppEnv, user: UserRecord, token: string): Promise<{ spreadsheetId: string; spreadsheetUrl: string }> {
  if (user.spreadsheetId) {
    try {
      const spreadsheetUrl = await ensureTabs(token, user.spreadsheetId);
      return { spreadsheetId: user.spreadsheetId, spreadsheetUrl };
    } catch (e) {
      // 404: the user deleted (or trashed and purged) the sheet — create a fresh one.
      if (!(e instanceof SheetsError && e.status === 404)) throw e;
    }
  }
  const created = await createSpreadsheet(token, env.SPREADSHEET_TITLE || 'Family Calendar Data');
  user.spreadsheetId = created.spreadsheetId;
  await putUser(env, user);
  return created;
}

async function getUser(env: AppEnv, sub: string): Promise<UserRecord | null> {
  return env.KV.get<UserRecord>(`user:${sub}`, 'json');
}

async function putUser(env: AppEnv, user: UserRecord): Promise<void> {
  await env.KV.put(`user:${user.sub}`, JSON.stringify(user));
}

async function sessionUser(request: Request, env: AppEnv): Promise<UserRecord | null> {
  const token = readCookie(request, SESSION_COOKIE);
  if (!token) return null;
  const sub = await env.KV.get(`sess:${token}`);
  return sub ? getUser(env, sub) : null;
}

async function requireUser(request: Request, env: AppEnv): Promise<UserRecord> {
  const user = await sessionUser(request, env);
  if (!user) throw new HttpError(401, 'not signed in');
  return user;
}

/** Mutations must carry a custom header (forces a CORS preflight, which we never allow) and a same-origin Origin. */
function checkCsrf(request: Request, env: AppEnv): void {
  if (request.headers.get('x-fc-csrf') !== '1') throw new HttpError(403, 'missing csrf header');
  const origin = request.headers.get('origin');
  if (origin && origin !== new URL(env.APP_URL).origin && origin !== new URL(request.url).origin) {
    throw new HttpError(403, 'bad origin');
  }
}

function feedUrl(env: AppEnv, token: string): string {
  return `${env.APP_URL.replace(/\/$/, '')}/ics/${token}.ics`;
}

function json(body: unknown, status = 200, cookies: string[] = []): Response {
  const headers = new Headers({ 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' });
  for (const c of cookies) headers.append('set-cookie', c);
  return new Response(JSON.stringify(body), { status, headers });
}

function redirect(location: string, cookies: string[] = []): Response {
  const headers = new Headers({ location, 'cache-control': 'no-store' });
  for (const c of cookies) headers.append('set-cookie', c);
  return new Response(null, { status: 302, headers });
}

function cookie(env: AppEnv, name: string, value: string, maxAge: number, path: string): string {
  const secure = env.APP_URL.startsWith('https://') ? '; Secure' : '';
  return `${name}=${value}; Path=${path}; Max-Age=${maxAge}; HttpOnly; SameSite=Lax${secure}`;
}

function readCookie(request: Request, name: string): string | undefined {
  const header = request.headers.get('cookie') ?? '';
  for (const part of header.split(';')) {
    const [k, ...v] = part.trim().split('=');
    if (k === name) return v.join('=');
  }
  return undefined;
}

function withSecurityHeaders(res: Response): Response {
  const r = new Response(res.body, res);
  r.headers.set('x-content-type-options', 'nosniff');
  r.headers.set('referrer-policy', 'strict-origin-when-cross-origin');
  if (!r.headers.has('x-frame-options')) r.headers.set('x-frame-options', 'DENY');
  return r;
}
