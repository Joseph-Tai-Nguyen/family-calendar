---
description: Pre-deploy checklist (does not deploy)
---
Walk through docs/deployment.md "Post-deploy checks" and verify locally what can be verified: `npm run build` succeeds, `wrangler.jsonc` has a real KV id and https APP_URL, `public/_headers` CSP still allows everything the app loads, no secrets are committed (`git ls-files | grep -i -E "dev.vars$|secret|credential"`). Do NOT run deploy or set secrets — list the commands for the user instead.
