# Architecture

```
┌──────────────────────────── Browser (React SPA, PWA) ────────────────────────────┐
│ pages/ Calendar · Cycle · Events · Time Buddy · Settings                          │
│ state/store.tsx  ── local-first AppData in localStorage, debounced sync           │
│ src/shared/*     ── lunar / liturgical / cycle / events / time math (no network)  │
│ lib/xlsx.ts      ── .xlsx export/import (fflate) · ics download · notifications   │
└───────────────┬───────────────────────────────────────────────────────────────────┘
                │ same-origin fetch (cookie session, x-fc-csrf header)
┌───────────────▼─────────────── Cloudflare Worker ────────────────────────────────┐
│ /auth/login, /auth/callback   Google OAuth 2.0 code flow + PKCE + state cookie     │
│ /auth/me, /auth/logout        session in KV (30 days), optional token revocation   │
│ /api/data  GET|PUT            read / rewrite all sheet tabs                         │
│ /api/feed  POST|DELETE        create / revoke private ICS feed token                │
│ /ics/<token>.ics              builds iCalendar from the user's sheet (shared code)  │
│ everything else               static assets (dist/client) with SPA fallback         │
│ KV: user:<sub>  sess:<token>  atok:<sub>  feed:<token>                              │
└───────────────┬───────────────────────────────────────────────────────────────────┘
                │ OAuth access token (refreshed from encrypted refresh token)
┌───────────────▼─────────────── Google ───────────────────────────────────────────┐
│ Sheets API v4 → one spreadsheet "Family Calendar Data" in the user's Drive        │
│ tabs: meta · settings · periods · logs · events · clocks                          │
└───────────────────────────────────────────────────────────────────────────────────┘
```

## Request flows

### Sign-in

1. `GET /auth/login`: the Worker creates a `state` and a PKCE verifier and stores them in a short-lived HttpOnly cookie (`fc_oauth`, path `/auth`). It then redirects to Google with `access_type=offline` and `prompt=consent`.
2. `GET /auth/callback`: the Worker verifies `state` and exchanges the code (with the verifier). It decodes the ID token, which came straight from Google's token endpoint over TLS, and checks `aud`, `iss` and `exp`. Then it:
   - encrypts the refresh token with AES-GCM and stores the user record in KV,
   - caches the access token in KV,
   - creates the session `sess:<random>`,
   - sets the `fc_session` cookie (HttpOnly, SameSite=Lax, Secure on https),
   - redirects to `/#/settings?login=ok`.

### Load and save

- `GET /api/data` runs `ensureSpreadsheet`: it creates the sheet on first use, adds any missing tabs, and recreates the sheet if it was deleted (404). It then batch-reads all tabs and returns raw rows. The browser parses them with `fromTables`.
- `PUT /api/data` validates the rows (`validateTables` checks headers and sizes), then runs `batchClear` and `batchUpdate` with `RAW` values.

### Sync algorithm (browser)

The browser stores `lastSyncedAt` (the `meta.updatedAt` value last agreed with the server). After a pull:

- Remote empty → push local.
- Local pristine, or both equal → take remote.
- Only one side changed since `lastSyncedAt` → that side wins.
- Both changed → ask the user (`window.confirm`).

Every local edit stamps `meta.updatedAt` and schedules a push 1.5 s later. Pending pushes are flushed when the tab is hidden, and the browser re-syncs when it comes back online.

### Reminders

`buildReminders(data, from, to)` in `src/shared/events/events.ts` is the only reminder engine. It is used by:

- **Events → Upcoming** (UI list),
- **Browser notifications**: checked every minute while the app is open, each reminder shown once per device per day,
- **ICS download and ICS feed**: grouped per item, with one `VALARM` per lead time. Calendar apps then remind even when the app is closed.

## Security notes

- **Scope:** `openid email profile drive.file`. The app can only touch files it created.
- **CSRF:** mutations need the `x-fc-csrf: 1` header (forces a CORS preflight, which the Worker never approves) and a same-origin `Origin`.
- **Headers:** CSP via `public/_headers` for static assets. The Worker adds `nosniff`, `DENY` framing and a referrer policy.
- **Feed tokens:** 24 random bytes, revocable and rotatable. The feed leaves out cycle data unless the user opts in.
- **PIN lock:** a device-local salted SHA-256 privacy screen, not encryption.
- **No PII in logs:** the Worker logs only unexpected errors (`console.error(err)`), and nothing is logged on the request path.
