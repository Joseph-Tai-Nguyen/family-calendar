# GEMINI.md

@./AGENTS.md

## Gemini CLI specifics

- `.gemini/settings.json` loads both `AGENTS.md` and `GEMINI.md` as context files.
- Custom commands live in `.gemini/commands/*.toml`: `/test`, `/check`, `/add-feast`, `/add-holiday`, `/schema-change`.
- Run shell commands from the repository root. On Windows, use PowerShell-compatible syntax for ad-hoc commands. npm scripts already work cross-platform.
- Do not run `npm run deploy` or `wrangler secret put` unless the user explicitly asks.
