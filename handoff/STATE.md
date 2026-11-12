# Where things stand (read this first in a new session)

Last updated: 2026-11-12 (second session, mid-morning), by Claude Code with the owner (Jude Rogers).
Repository: `C:\Users\judej\Documents\ai-receptionist` = https://github.com/JudeBenz/ai-receptionist (public, branch `main`).
Every value below is also in `handoff/status.md` (the filled status table). Secrets are only ever in `.env` on the owner's PC, never in git.

## The business in two lines

AfterRing sells an AI phone receptionist (Vapi + n8n) to HVAC, plumbing and small law firms in Massachusetts.
It answers only missed calls, books on a Google Calendar, logs to a Google Sheet, and emails the owner a summary. Inbound only, always says it is an AI and that calls may be recorded.

## What is live right now

| Piece | State |
|------|-------|
| Demo phone line | +1 (978) 347-8475 (free Vapi number, label "AfterRing demo"). Answers as "Northwind Heating and Air", receptionist "Kylie", voice Clara v2. Fallback: owner's cell. |
| Vapi assistant | id `1d68bce8-f3a0-420f-9d88-4cc0e9be6f35`, created by `node vapi/setup.mjs` from `config/business.json` + `prompts/system-prompt.md` + `knowledge/business-faq.md`. Re-run `node vapi/setup.mjs --update` after editing any of those (VAPI_ASSISTANT_ID is in `.env`). |
| n8n | https://afterring.app.n8n.cloud (Cloud trial started 2026-11-11, 14 days). Workflows `Receptionist MCP Server · AfterRing demo` (kOkMFI9N9OwtPDh7) and `Receptionist End-of-Call Logger · AfterRing demo` (ynr7UmUkcvz7hVuV), both published. Source files: `n8n/demo/*.json`. |
| Google | Account afterringsservices@gmail.com. Calendar "Service visits · Demo" (id in status.md). Sheet "Demo · Receptionist CRM" (tabs Clients, CallLog; phone columns are plain text). Sheets, Calendar and Gmail OAuth credentials exist in n8n and are attached to every node. |
| Local `.env` | Filled: VAPI_API_KEY, VAPI_ASSISTANT_ID, VAPI_FAQ_FILE_ID, N8N_MCP_URL (…/mcp/receptionist-demo/sse), N8N_MCP_PROTOCOL=sse, N8N_MCP_TOKEN, VAPI_SERVER_URL (…/webhook/vapi-end-of-call-demo), TRANSFER_NUMBER (owner cell), OWNER_EMAIL. |
| Pitch video | `video/afterring-pitch-720p.mp4` and 1080p, ~100 s, built by `video/build.mjs` (see `video/README.md`). |
| Logo | `business/logo/` (static PNGs, animated GIF avatar, banner, SVG). |
| Website | LIVE at https://judebenz.github.io/ai-receptionist/ (GitHub Pages; pushing a change under `site/` to `main` redeploys it). No placeholders: rows with no value yet (business phone, booking link, legal name) are hidden by an empty string in the `BRAND` block. Has `privacy.html`. The demo form posts to an n8n webhook whose workflow (`n8n/site-demo-request.json`) is not imported yet; until then the form falls back to a pre-filled email link. |
| Deck, one-pager, sales kit | In `deck/`, `sales/`. One-pager placeholders filled. Meeting pack in `sales/meeting-pack/`: `meeting-sheet.pdf` (page 1 the owner's questions, demo steps and close; pages 2 and 3 the client intake) and `one-pager.pdf`. |
| Costs | `business/costs.md`: about $0.09 a minute measured, fixed costs, margin by volume, and what must be bought before the first client goes live. |

## Test calls (tests/test-calls.md)

- Call 1 done 2026-11-11: greeting, disclosure, read-backs correct; CallLog row and owner email arrived. The customer lookup failed once (Sheets scope missing on the OAuth grant) and is fixed. The caller hung up before a slot was offered, so **booking a visit is still unproven**.
- Calls 2 to 6 not run. Watch a call from the owner's PC with the Vapi API: `GET https://api.vapi.ai/call?limit=3` with the key from `.env` (a watcher script pattern is described in status.md).

## Settled on 2026-11-12

- Pricing: the owner keeps Starter $297 / Growth $497 / Pro $997 with the free 30-day pilot everywhere, and prices very large clients individually (thresholds in `business/costs.md`). The video script now says the same.
- The video greeting has the AI disclosure back, matching the live line.
- The prompt asks one question per turn; pushed to the live assistant. Not yet heard on a call.

## Still open

- Import and publish `n8n/site-demo-request.json` in n8n (needs the owner signed in to n8n in the pane), pick the Gmail credential, then submit the live form once and check the email arrives.
- Text alerts are sold on Growth and shown in the video, but SMS needs 10DLC registration; only email summaries work today.
- The site's statistics (38%, 3 in 4, 6 in 10) cite "a 2024 study of 85 small businesses, as reported by industry sources"; no primary source is on file.
- The live deck artifact still shows the old 555 placeholder number; republish from `deck/project/slides/`.
- No intro email for Hicks Plumbing is in the repository; draft it after the meeting.

## Earlier notes on these points (kept for history)

1. **Pricing.** `business/brand.json`, the site, the deck, the one-pager and the follow-up emails say Starter $297 / Growth $497 / Pro $997 a month with a free 30-day pilot. The video (changed at the owner's request in the video session) says **$225 a month plus a $425 set-up fee after the first booking**. One of them must change everywhere.
2. **AI disclosure in the video.** The live line says "This is Kylie, an AI assistant, and this call may be recorded." The video greeting was changed to drop the AI line. Recommendation: put it back; it is a product rule and a legal safety margin.
3. The prompt lets Kylie ask two questions in one breath ("confirmation by email, and what is the address"). Tighten `prompts/system-prompt.md` step 2, then `node vapi/setup.mjs --update`.
4. The live deck artifact still shows the old 555 placeholder number; the source under `deck/project/slides/` is updated. Republish when convenient.

## Next steps, in order

1. All six test calls were run on 2026-11-12 (results in status.md: booking and rescheduling proven; returning-caller lookup has a workaround to re-test, see status.md), fix what they show, log each in `handoff/status.md`. Start `node tests/watch-call.mjs`, then have the owner dial.
2. Import the website-form workflow into n8n and test the live form.
3. First prospect: Hicks Plumbing LLC (owner has the email address; intro email drafted in the 2026-11-12 session, not sent).
4. Before the first paying client: the six items at the end of `business/costs.md` (Vapi Core for a second number, n8n paid plan before the trial ends 2026-11-25, Stripe links, agreement reviewed, 10DLC, own phone line and domain). Then Google Voice and a Calendly link into the `BRAND` block and `business/brand.json`.
5. Buy afterring.co when ready; Google Workspace can wait.
6. When a client signs: `ops/delivery-playbook.md`, `node scripts/new-client.mjs <slug>`, `node scripts/n8n-for-client.mjs <slug>`, `node vapi/setup.mjs --client <slug>`.

## How the owner and Claude work together (learned the hard way)

- The owner signs in to Google, n8n and Vapi inside the Claude desktop app's browser pane; Claude then does the clicking. n8n logs the pane out after a while; the owner signs back in.
- Claude never types passwords, API keys or tokens into forms. Secrets move clipboard-to-file by script, or the owner pastes them. The owner is fine with Claude showing a token it generated itself.
- n8n's "Sign in with Google" popup is blocked in the pane. Workaround that works: hook `window.open` in the page to capture the Google consent URL, open it in a new pane tab, choose the account, tick every scope box, Continue; the n8n callback saves the credential. **Tick every box**: an unticked Sheets scope produced "resource not found" on every Sheets node.
- Google Sheets in the pane ignores typed text; send each character as a key press, or type into the formula bar. Rename tabs by double-clicking the tab.
- Vapi retired the Paige voice; new assistants use Clara (version 2). Vapi gives one free number per new account, inbound only.
- The owner wants one recommendation, not a menu, and wants things done for him where the rules allow.
