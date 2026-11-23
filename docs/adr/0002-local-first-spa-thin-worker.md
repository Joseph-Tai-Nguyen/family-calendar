# ADR-0002: Local-first SPA with a thin Worker; shared domain code

- Status: Accepted
- Date: 2026-11-23

## Context

Calendar computations (lunar conversion, liturgical precedence, predictions, time zones) are deterministic and need no server. Workers have tight CPU limits. The ICS feed still needs the same logic on the server.

## Decision

- All domain logic lives in `src/shared/` as pure TypeScript with no DOM or Worker APIs, and is unit-tested with Vitest.
- The SPA computes everything locally and persists to `localStorage`. It works fully offline and without an account.
- The Worker does only what needs secrets or must run while the app is closed: OAuth, the Sheets proxy and the ICS feed. The ICS feed imports the same `src/shared` code.
- No date or time-zone libraries. ISO date strings plus `Intl` keep the bundle small and behaviour identical in the browser and the Worker.

## Consequences

- ✅ Fast UI, offline support and a small Worker. One implementation is tested once.
- ⚠️ The ICS feed recomputes on each fetch (cached for 1 h). Its horizon is kept to about 1 year to stay within CPU limits.
- ⚠️ Background push notifications need Web Push plus a Worker cron (future work). The ICS feed covers reminders for now.
