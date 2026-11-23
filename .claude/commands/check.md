---
description: Full pre-commit check (tests, typecheck, build, docs drift)
---
1. Run `npm test`, `npm run typecheck`, `npm run build`.
2. Check `git diff --stat` and verify that any change to `src/shared/schema.ts`, env vars, or `wrangler.jsonc` is reflected in `docs/data-model.md`, `docs/deployment.md` and `README.md`.
3. Verify new UI strings exist in both `en` and `vi` in `src/app/i18n.ts`.
4. Report a short pass/fail checklist.
