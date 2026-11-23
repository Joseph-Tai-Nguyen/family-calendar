# CLAUDE.md

@AGENTS.md

## Claude Code specifics

- Project slash commands live in `.claude/commands/`: `/test`, `/check`, `/add-feast`, `/add-holiday`, `/schema-change`, `/release-check`.
- `.claude/settings.json` pre-allows the safe project commands (npm test/build/typecheck, git status/diff). Put personal overrides in `.claude/settings.local.json`, which is git-ignored.
- `.claude/launch.json` defines `dev` (Vite + Worker on :5173) and `worker-preview` (production build served by wrangler on :8787) for the browser preview.
- On Windows, npm scripts run under `cmd.exe`. Avoid POSIX-only syntax such as `>/dev/null`, `&&` inside quoted globs, or `rm -rf` in `package.json` scripts.
- When you change anything in `src/shared`, run `npm test` before touching the UI. The UI depends on those functions being right.
- For UI changes, verify in the browser preview: Calendar (lunar and liturgical overlays), Events → Upcoming, Time Buddy → Planner, and Settings → Export Excel.
