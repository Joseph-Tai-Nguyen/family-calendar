/**
 * Google OAuth 2.0 (authorization-code flow with PKCE + offline access).
 *
 * Scope `drive.file` only lets the app see files it created itself — the
 * app never gets access to the rest of the user's Drive.
 */
import type { AppEnv, UserRecord } from './env';
import { b64urlDecode, b64urlEncode, decrypt, sha256 } from './crypto';

export const SCOPES = ['openid', 'email', 'profile', 'https://www.googleapis.com/auth/drive.file'];

const AUTH_URL = 'https://accounts.google.com/o/oauth2/v2/auth';
const TOKEN_URL = 'https://oauth2.googleapis.com/token';
const REVOKE_URL = 'https://oauth2.googleapis.com/revoke';

export function redirectUri(env: AppEnv): string {
  return `${env.APP_URL.replace(/\/$/, '')}/auth/callback`;
}

export async function authorizationUrl(env: AppEnv, state: string, codeVerifier: string): Promise<string> {
  const challenge = await sha256(codeVerifier);
  const params = new URLSearchParams({
    client_id: env.GOOGLE_CLIENT_ID,
    redirect_uri: redirectUri(env),
    response_type: 'code',
    scope: SCOPES.join(' '),
    access_type: 'offline',
    include_granted_scopes: 'true',
    prompt: 'consent',
    state,
    code_challenge: challenge,
    code_challenge_method: 'S256',
  });
  return `${AUTH_URL}?${params}`;
}

export interface TokenResponse {
  access_token: string;
  expires_in: number;
  refresh_token?: string;
  id_token?: string;
  scope: string;
  token_type: string;
}

export class GoogleAuthError extends Error {
  constructor(
    message: string,
    readonly status = 401,
  ) {
    super(message);
  }
}

async function tokenRequest(body: Record<string, string>): Promise<TokenResponse> {
  const res = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams(body),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new GoogleAuthError(`token endpoint ${res.status}: ${text.slice(0, 200)}`, res.status === 400 ? 401 : 502);
  }
  return res.json();
}

export function exchangeCode(env: AppEnv, code: string, codeVerifier: string): Promise<TokenResponse> {
  return tokenRequest({
    code,
    client_id: env.GOOGLE_CLIENT_ID,
    client_secret: env.GOOGLE_CLIENT_SECRET,
    redirect_uri: redirectUri(env),
    grant_type: 'authorization_code',
    code_verifier: codeVerifier,
  });
}

export interface IdTokenClaims {
  sub: string;
  email: string;
  name?: string;
  picture?: string;
  aud: string;
  iss: string;
  exp: number;
}

/**
 * Decode the ID token received directly from Google's token endpoint over TLS
 * (OpenID Connect Core §3.1.3.7 allows skipping signature validation in this
 * case). Audience, issuer and expiry are still checked.
 */
export function decodeIdToken(env: AppEnv, idToken: string): IdTokenClaims {
  const payload = JSON.parse(new TextDecoder().decode(b64urlDecode(idToken.split('.')[1]))) as IdTokenClaims;
  if (payload.aud !== env.GOOGLE_CLIENT_ID) throw new GoogleAuthError('id_token audience mismatch');
  if (!['https://accounts.google.com', 'accounts.google.com'].includes(payload.iss)) throw new GoogleAuthError('id_token issuer mismatch');
  if (payload.exp * 1000 < Date.now() - 60_000) throw new GoogleAuthError('id_token expired');
  return payload;
}

/** Access token for a user, cached in KV until shortly before expiry. */
export async function accessTokenFor(env: AppEnv, user: UserRecord): Promise<string> {
  const cacheKey = `atok:${user.sub}`;
  const cached = await env.KV.get(cacheKey);
  if (cached) return cached;
  const refreshToken = await decrypt(user.refreshToken, env.TOKEN_ENCRYPTION_KEY);
  const tok = await tokenRequest({
    client_id: env.GOOGLE_CLIENT_ID,
    client_secret: env.GOOGLE_CLIENT_SECRET,
    refresh_token: refreshToken,
    grant_type: 'refresh_token',
  });
  const ttl = Math.max(60, tok.expires_in - 120);
  await env.KV.put(cacheKey, tok.access_token, { expirationTtl: ttl });
  return tok.access_token;
}

export async function revoke(token: string): Promise<void> {
  await fetch(`${REVOKE_URL}?token=${encodeURIComponent(token)}`, { method: 'POST' }).catch(() => undefined);
}

export function pkceVerifier(): string {
  const buf = new Uint8Array(48);
  crypto.getRandomValues(buf);
  return b64urlEncode(buf);
}
