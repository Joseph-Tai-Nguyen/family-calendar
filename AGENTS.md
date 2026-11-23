# AGENTS.md — instructions for AI coding agents

This file is the **single source of truth** for AI assistants (Claude Code, Gemini CLI, Codex, Cursor, …).
`CLAUDE.md` and `GEMINI.md` import it and only add tool-specific notes.

## Project in one paragraph

Family Calendar is a React + TypeScript SPA with a Cloudflare Worker backend. It combines a period tracker, the Vietnamese lunar calendar with giỗ (death anniversary) reminders, the Catholic liturgical calendar, personal events, and a world-clock "time buddy". User data lives in a Google Sheet in the user's Drive, accessed through the Worker with OAuth (`drive.file` scope). The app is local-first (localStorage) and can export to .xlsx, JSON and .ics. Read `PROJECT_CONTEXT.md` for the domain glossary and `REQUIREMENTS.md` for scope.

## Commands

```bash
npm install
npm run dev         # Vite :5173 + wrangler dev :8787 (Vite proxies /api /auth /ics)
npm test            # vitest (tests/**/*.test.ts) — run after any change in src/shared
npm run typecheck   # wrangler types + tsc for app, worker and node/tests configs
npm run build       # typecheck + vite build → dist/client
npm run deploy      # build + wrangler deploy
```

Always run `npm test` and `npm run typecheck` before you call a task done.

## Architecture map

| Path | Role | Runs in |
| --- | --- | --- |
| `src/shared/` | Pure domain logic. **No DOM, no Worker APIs, no network.** | browser + Worker + tests |
| `src/shared/date.ts` | ISO-date ("YYYY-MM-DD") + epoch-day math. Never use `Date` local-time getters in shared code. | |
| `src/shared/lunar/` | Hồ Ngọc Đức lunar algorithm (UTC+7), Can Chi, solar terms, holidays | |
| `src/shared/liturgical/` | Roman calendar: seasons, precedence, transfers, regional proper days | |
| `src/shared/cycle/` | Cycle stats/predictions/pregnancy | |
| `src/shared/events/` | Recurring personal events + `buildReminders()` (the single reminder engine) | |
| `src/shared/schema.ts` | AppData ⇄ sheet tables. **Header order is a contract** with existing sheets and .xlsx backups. | |
| `src/shared/ics.ts` | iCalendar output | |
| `src/worker/` | OAuth (PKCE), sessions in KV, Sheets API, ICS feed | Cloudflare Worker |
| `src/app/` | React UI. `state/store.tsx` handles local-first state and sync. `i18n.ts` holds the strings. | browser |
| `tests/` | Vitest unit tests for `src/shared` | node |

## Conventions

- TypeScript strict mode. Prefer small pure functions in `src/shared` with unit tests over logic inside components.
- Dates: pass `ISODate` strings around. Use `todayISO()` only at the edges (UI or Worker request), never deep in the logic.
- Time zones: use the helpers in `src/shared/time/timezones.ts` (Intl-based). Do not add moment, dayjs, luxon or date-fns-tz.
- **i18n:** every user-visible string goes through `t('key')` in `src/app/i18n.ts`, in **both** `en` and `vi`. Domain titles (liturgical and lunar) carry `{ en, vi }` objects.
- **State changes:** always go through `update(draft => …)` from `useStore()`. It clones, stamps `meta.updatedAt`, persists and schedules sync.
- **Schema changes:**
  1. Add new columns at the **end** of a table in `TABLES`.
  2. Make `fromTables` tolerate their absence.
  3. Bump `SCHEMA_VERSION` only if a migration is needed.
  4. Add a round-trip test.
  5. Update `docs/data-model.md`.
- New settings go into `DEFAULT_SETTINGS`. Stored settings are deep-merged over the defaults, so old sheets keep working.
- Styling: plain CSS in `src/app/styles.css` with CSS variables for themes. No CSS framework.
- Dependencies: keep them minimal. Runtime deps are `react`, `react-dom` and `fflate`. Ask before adding more.
- Keep Worker code light (the free plan allows 10 ms of CPU). Heavy work belongs in the browser.

## Domain rules to keep (don't "simplify" these away)

- Lunar calendar uses **UTC+7** (`VN_TIMEZONE`). Tết 1985 is the classic test that it differs from China.
- Giỗ: observed in the **regular** month even if the death was in a leap month. Day 30 → 29 in short months. Count = lunar year − death lunar year.
- Liturgical: proper celebrations win precedence ties over the base Sunday/weekday. Sundays of Advent, Lent and Easter outrank solemnities, which are then transferred. Memorials in Lent become commemorations.
- Cycle: luteal phase defaults to 14. The fertile window is ovulation −5 … +1. Cycles outside 15–60 days are ignored in averages.

## Security & privacy rules

- Never log user data or tokens. Never put health data in URLs or query strings.
- Refresh tokens are AES-GCM encrypted at rest (`TOKEN_ENCRYPTION_KEY`). Access tokens are cached in KV with a TTL.
- Mutating endpoints require the `x-fc-csrf: 1` header and a same-origin `Origin`.
- Keep the OAuth scope as `drive.file`. Do not widen it.
- Secrets live in `.dev.vars` (local) or `wrangler secret` (prod). Never commit them.

## Definition of done

1. `npm test` and `npm run typecheck` pass.
2. New domain logic has tests.
3. UI strings exist in both `en` and `vi`.
4. Docs are updated if behaviour, schema, env vars or setup changed (`README.md`, `docs/*`, `REQUIREMENTS.md` status).
