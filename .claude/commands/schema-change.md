---
description: Safely add a field to the Google Sheet / xlsx schema
argument-hint: <table> <column> <description>
---
Add a column for: $ARGUMENTS

Follow AGENTS.md "Schema changes": append the column at the END of `TABLES[table]` in `src/shared/schema.ts`; update the type in `src/shared/model.ts`, `toTables`, `fromTables` (tolerate missing column → default), and any UI. Add a round-trip test. Update `docs/data-model.md`. Run `npm test && npm run typecheck`.
