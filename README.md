# Family Calendar · Lịch Gia Đình

A private family web app that combines:

- **Period & cycle tracker**, modelled on the feature set of the Android app *Period Calendar Period Tracker*: period logging, cycle/ovulation/fertile-window predictions, daily log (flow, symptoms, moods, cervical mucus, BBT, weight, intercourse, pill, ovulation/pregnancy tests, notes), charts, pregnancy mode, reminders, PIN lock, backup/restore.
- **Vietnamese lunar calendar (Âm lịch)** on every day of the calendar: lunar date, Can Chi, solar terms (tiết khí), auspicious hours (giờ hoàng đạo), leap months, traditional holidays, and the Tết Masses of the Church in Vietnam.
- **Death anniversary (giỗ) reminders** on the lunar calendar. You enter the solar date of death and it is converted for you. Leap months and short months are handled.
- **Catholic liturgical calendar**: seasons, colours, Sundays (cycle A/B/C), solemnities, feasts, memorials, holy days of obligation and fast days. Regional calendars for Canada, the USA and Vietnam are included, with reminders for the days you pick.
- **Personal important days**: birthdays, wedding anniversaries, name days (patron saints, *lễ bổn mạng*) and memorials, on the solar or lunar calendar.
- **Time Buddy**: world clocks, a meeting planner with a 24-hour timeline across cities, and a time-zone converter, modelled on the feature set of the Android app *Time Buddy – Clock & Converter*.

It is hosted on **Cloudflare Workers**. Your data is stored in a **Google Sheet in your own Google Drive** after you sign in with Google. You can back it up to and restore it from **Excel (.xlsx)**, JSON or an iCalendar (.ics) file. The UI is in **English and Vietnamese**.

> Cycle predictions are estimates for personal tracking. They are not medical advice and not a contraceptive method.

---

## Quick start (local)

```bash
npm install
npm run dev          # Vite on http://localhost:5173 + Worker on :8787 (API proxied)
npm test             # unit tests for lunar / liturgical / cycle / time-zone logic
npm run build        # typecheck (app, worker, tests) + production bundle
```

The app works with no Google setup. Data then stays in the browser's `localStorage`. To enable Google Sheets sync, follow [docs/deployment.md](docs/deployment.md):

1. Create a Google OAuth client (Web application). Redirect URI: `http://localhost:5173/auth/callback`.
2. Copy `.dev.vars.example` to `.dev.vars` and fill in `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` and `TOKEN_ENCRYPTION_KEY` (`npm run gen:key`).
3. Run `npm run dev`, then go to Settings → *Sign in with Google*.

## Deploy to Cloudflare

```bash
npx wrangler login
npx wrangler kv namespace create KV           # paste the id into wrangler.jsonc
npx wrangler secret put GOOGLE_CLIENT_ID
npx wrangler secret put GOOGLE_CLIENT_SECRET
npx wrangler secret put TOKEN_ENCRYPTION_KEY
# set APP_URL in wrangler.jsonc to your https://… origin, and add <APP_URL>/auth/callback to the OAuth client
npm run deploy
```

See [docs/deployment.md](docs/deployment.md) for the full checklist.

## Project layout

```
src/
  shared/            Pure TypeScript domain logic, used by both browser and Worker (unit-tested)
    date.ts            timezone-free ISO date math
    lunar/             Vietnamese lunar calendar + holidays
    liturgical/        Catholic liturgical calendar
    cycle/             cycle statistics & predictions
    events/            recurring personal events (giỗ…) + unified reminder builder
    time/              IANA time-zone math (Intl) + city list
    model.ts           AppData / Settings types and defaults
    schema.ts          AppData <-> sheet tables (Google Sheets & .xlsx)
    ics.ts             iCalendar generation (VALARM reminders)
  worker/            Cloudflare Worker: Google OAuth, Sheets API, ICS feed
  app/               React SPA (pages, components, state/sync, i18n, xlsx)
tests/               Vitest unit tests
public/              PWA manifest, service worker, icon, _headers (CSP)
docs/                Architecture, data model, algorithms, deployment, ADRs
.claude/ .gemini/    AI-assistant settings and slash commands
```

## Documentation

| File | What's in it |
| --- | --- |
| [REQUIREMENTS.md](REQUIREMENTS.md) | Functional and non-functional requirements, with feature-parity checklists |
| [PROJECT_CONTEXT.md](PROJECT_CONTEXT.md) | Background, users, domain glossary (Vietnamese and Catholic terms), decisions |
| [docs/architecture.md](docs/architecture.md) | Components, request flows, sync, security |
| [docs/data-model.md](docs/data-model.md) | Google Sheet tabs and columns |
| [docs/algorithms.md](docs/algorithms.md) | Lunar conversion, liturgical rules, predictions, time zones |
| [docs/deployment.md](docs/deployment.md) | Google Cloud and Cloudflare setup |
| [AGENTS.md](AGENTS.md) · [CLAUDE.md](CLAUDE.md) · [GEMINI.md](GEMINI.md) | Instructions for AI coding assistants |

## License

GPL-3.0. See [LICENSE](LICENSE).
