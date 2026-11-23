# Data model

The source of truth for this document is `src/shared/schema.ts` (`TABLES`). The Google Sheet and the .xlsx backup use the same layout:

- one tab per table,
- row 1 is the header,
- every cell is a string (written with `valueInputOption=RAW`).

Columns are matched **by header name**, so users may reorder columns or add extra columns of their own. Missing columns are read as empty.

| Tab | Columns | Notes |
| --- | --- | --- |
| `meta` | `key`, `value` | `schemaVersion`, `updatedAt` (ISO timestamp used for sync) |
| `settings` | `key`, `value` | One row per top-level `Settings` key, with the value JSON-encoded. Merged over defaults on load. |
| `periods` | `id`, `start`, `end`, `notes` | `start`/`end` are `YYYY-MM-DD`. An empty `end` means an ongoing period. |
| `logs` | `date`, `flow`, `symptoms`, `moods`, `mucus`, `temperature`, `weight`, `intercourse`, `pill`, `ovulationTest`, `pregnancyTest`, `notes` | One row per logged day. Lists are comma-separated keys (see `SYMPTOMS` / `MOODS` in `model.ts`). Temperature is in °C and weight in kg. Booleans are `TRUE`/`FALSE`. |
| `events` | `id`, `kind`, `title`, `personName`, `calendar`, `day`, `month`, `year`, `leapMonth`, `remindDays`, `remindTime`, `notes`, `enabled` | Details below the table. |
| `clocks` | `id`, `label`, `timeZone`, `order`, `home` | `timeZone` is an IANA id (e.g. `Asia/Ho_Chi_Minh`) |

`events` column details:

- `kind` ∈ `death_anniversary`, `birthday`, `wedding`, `name_day`, `memorial`, `other`.
- `calendar` ∈ `lunar`, `solar`.
- For lunar events, `day`, `month` and `year` are **lunar** values.
- `remindDays` is a comma-separated list of days before, e.g. `7,1,0`.

## Enumerations

- `flow`: `''`, `spotting`, `light`, `medium`, `heavy`
- `mucus`: `''`, `dry`, `sticky`, `creamy`, `watery`, `egg_white`
- `intercourse`: `''`, `protected`, `unprotected`
- `ovulationTest` / `pregnancyTest`: `''`, `negative`, `positive`

## Worker KV keys

| Key | Value | TTL |
| --- | --- | --- |
| `user:<google sub>` | `UserRecord` JSON (email, name, encrypted refresh token, spreadsheetId, feedToken) | none |
| `sess:<token>` | google sub | 30 days |
| `atok:<google sub>` | Google access token | `expires_in` − 120 s |
| `feed:<token>` | google sub | none (deleted on revoke/rotate) |

## Changing the schema

1. Append new columns at the end of the table in `TABLES`, and update `toTables` and `fromTables`.
2. `fromTables` must accept sheets that do not have the column yet.
3. The Worker's `ensureTabs` adds new **tabs** automatically. New **columns** need no migration, because a full rewrite happens on the next save.
4. Add a round-trip test in `tests/time-events.test.ts`, or a new test file.
