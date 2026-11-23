---
description: Add a Vietnamese lunar observance
argument-hint: <lunar M/D> <vi title> | <en title> [traditional|catholic_tet]
---
Add an entry to `VN_LUNAR_HOLIDAYS` in `src/shared/lunar/vietnamese-holidays.ts` using: $ARGUMENTS
Use `day: 'last'` for "last day of the month". Add a test in `tests/lunar.test.ts` that checks the solar date for the current and next lunar year (compute expected dates with `lunarToSolar`, and cross-check one against a published Vietnamese calendar). Run `npm test`.
