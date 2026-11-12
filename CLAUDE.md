# Claude Code instructions for this repository

Read `handoff/STATE.md` first, then `handoff/status.md`. They say what is live, what is unverified and what comes next. `README.md` and `LEARNINGS.md` explain the build; `handoff/facts.json` has every non-secret fact.

Rules:
- Never commit `.env`, anything under `clients/` except `README.md` and `_template/`, or any key, token, password or prospect email address. The repo is public.
- Secrets are handled only by the owner or by scripts that move them clipboard-to-file; never type them into web forms and never print them.
- After changing `config/`, `prompts/` or `knowledge/`, run `node vapi/setup.mjs --update` so the live assistant matches the files.
- Keep `handoff/status.md` current: every account, id, URL and test result goes there in the same change.
- The product is inbound only, always discloses it is an AI and that calls may be recorded, and never sends marketing texts. Do not weaken that in any prompt, video or email.
- Commit messages end with `Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>`.
- The owner works in the Claude desktop app with the browser pane signed in to Google, n8n and Vapi. Do the clicking for him; ask him only for sign-ins and secrets.
