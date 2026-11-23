# Deployment & setup

## 1. Google Cloud (OAuth + Sheets API)

1. Go to <https://console.cloud.google.com/> and create a project (e.g. "family-calendar").
2. Open **APIs & Services → Library** and enable the **Google Sheets API**. The Drive API is not needed, because the app only creates and reads its own spreadsheet through the Sheets API.
3. Open **APIs & Services → OAuth consent screen** and set it up:
   - User type: *External*.
   - App name, support email and developer email.
   - Scopes: `openid`, `email`, `profile`, `.../auth/drive.file`.
   - While the app is in *Testing* mode, add each family member's Google account under **Test users**. Testing mode allows up to 100 test users, and refresh tokens expire after 7 days.
   - For long-lived sign-ins, **publish** the app. `drive.file` is a non-sensitive scope, so verification is lightweight.
4. Open **APIs & Services → Credentials → Create credentials → OAuth client ID**:
   - Type: *Web application*.
   - Authorized redirect URIs:
     - `http://localhost:5173/auth/callback` (local dev, through the Vite proxy)
     - `https://<your-worker>.<account>.workers.dev/auth/callback` (or your custom domain)
5. Copy the client ID and client secret.

## 2. Local development

```bash
cp .dev.vars.example .dev.vars
npm run gen:key            # paste the output into TOKEN_ENCRYPTION_KEY
# fill GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET
npm run dev                # http://localhost:5173
```

`wrangler dev` runs a local KV store in `.wrangler/`, so no Cloudflare account is needed for local work. `APP_URL` in `wrangler.jsonc` is `http://localhost:5173`, because the browser talks to the Worker through Vite's proxy.

## 3. Cloudflare

```bash
npx wrangler login
npx wrangler kv namespace create KV
# → copy the id into wrangler.jsonc (kv_namespaces[0].id)
```

Set `vars.APP_URL` in `wrangler.jsonc` to the production origin, e.g. `https://family-calendar.<account>.workers.dev`. You can also add an `env.production` block for it.

```bash
npx wrangler secret put GOOGLE_CLIENT_ID
npx wrangler secret put GOOGLE_CLIENT_SECRET
npx wrangler secret put TOKEN_ENCRYPTION_KEY   # same format as local: 32 random bytes, base64
npm run deploy
```

### Custom domain (optional)

In the Cloudflare dashboard, go to **Workers & Pages → family-calendar → Settings → Domains & Routes → Add custom domain**. Then update `APP_URL` and the Google redirect URI to match.

## 4. Post-deploy checks

- `GET /api/health` returns `{"ok":true,"configured":true}`.
- Sign in, add a period, then **Settings → Open Google Sheet**. The rows should appear within about 2 seconds.
- **Settings → Calendar subscription → Create feed URL**. Add the URL in Google Calendar via *Other calendars → From URL*. Google refreshes subscribed calendars every few hours.
- **Settings → Export Excel** downloads a workbook with the 6 tabs.

## 5. Rotating secrets

- **`TOKEN_ENCRYPTION_KEY`:** rotating it invalidates the stored refresh tokens. Users simply sign in again.
- **Google client secret:** create a new secret in Google Cloud, run `wrangler secret put GOOGLE_CLIENT_SECRET`, then delete the old secret.
- **Feed URL:** users can rotate it at any time (*New URL*). The old URL stops working immediately.
