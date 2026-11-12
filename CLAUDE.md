# Claude Code instructions for this repository

Read `handoff/STATE.md` first, then `handoff/status.md`. They say what is live, what is unverified and what comes next. `README.md` and `LEARNINGS.md` explain the build; `handoff/facts.json` has every non-secret fact.

Rules:
- Never commit `.env`, anything under `clients/` except `README.md` and `_template/`, or any key, token, password or prospect email address. The repo is public.
- Secrets are handled only by the owner or by scripts that move them clipboard-to-file; never type them into web forms and never print them.
- After changing `config/`, `prompts/` or `knowledge/`, run `node vapi/setup.mjs --update` so the live assistant matches the files.
- Keep `handoff/status.md` current: every account, id, URL and test result goes there in the same change.
- The product is inbound only, always states that calls may be recorded, never claims to be human, confirms it is an AI whenever a caller asks, and never sends marketing texts. Do not weaken those in any prompt, video or email. By default the greeting also says it is an AI assistant (the demo line does); since 2026-11-12 a client may instead choose a name-only greeting, recorded in their signed agreement and Schedule A (owner's decision after his own review of California law).
- Commit messages end with `Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>`.
- The owner works in the Claude desktop app with the browser pane signed in to Google, n8n and Vapi. Do the clicking for him; ask him only for sign-ins and secrets.
