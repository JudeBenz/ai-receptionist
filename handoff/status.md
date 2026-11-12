# Setup status

Date: 2026-11-11
Done by: Claude Code (browser pane) with the owner signed in

| Item | Value | Done |
|------|-------|------|
| Domain and registrar | not yet (afterring.co still to buy) | no |
| Business email | afterringsservices@gmail.com (plain Gmail for now) | yes |
| DNS verified (MX, SPF, DKIM, DMARC) | n/a until the domain exists | no |
| Outbound number | | no |
| Booking link | | no |
| Demo calendar ID | 7751c15adce7a167c15f6c6fc7ffacb845e196e747271133397c411ad8fd6b14@group.calendar.google.com (name "Service visits · Demo", Eastern time) | yes |
| Demo sheet ID | 105oIsIgzRQmt_Xpm0rg8f0-Idu7dOvKLdFn0xC-PGmI (name "Demo · Receptionist CRM", tabs Clients and CallLog with headers) | yes |
| n8n plan, trial ends | n8n Cloud trial (14 days from 2026-11-11), instance https://afterring.app.n8n.cloud, version 2.47.4. Workflows imported from n8n/demo: MCP server kOkMFI9N9OwtPDh7, end-of-call logger ynr7UmUkcvz7hVuV; Google Sheets, Calendar and Gmail OAuth credentials connected and attached; Bearer Auth set on the MCP trigger; both workflows published 2026-11-11. Verified from the owner PC: MCP /sse answers with the token and returns 403 without it; webhook returns 200 | yes |
| MCP production URL (ends in /sse?) | https://afterring.app.n8n.cloud/mcp/receptionist-demo/sse (yes, sse) | yes |
| Webhook production URL | https://afterring.app.n8n.cloud/webhook/vapi-end-of-call-demo | yes |
| Vapi number | +1 (978) 347-8475, label "AfterRing demo", id aac99670-b602-4e70-8bf0-fc93f98dfda7, inbound only (new accounts get 1 free number) | yes |
| Vapi assistant ID | 1d68bce8-f3a0-420f-9d88-4cc0e9be6f35 ("Northwind Heating and Air receptionist", voice Clara v2, FAQ file 96f9bd69-fa84-430f-a3dc-f02aa6bd11f9); attached to +1 (978) 347-8475 with fallback to the owner cell, number status active | yes |
| Vapi pricing seen | not recorded yet; free number, 1 per new account | partly |
| Test calls passed (of 6), notes on failures | Call 1 (2026-11-11 19:50 ET, 111 s): greeting, AI disclosure, name/number/address read-back all correct; lookup_client returned "resource not found" because the Sheets consent had been granted without the Sheets scope; caller hung up before a slot was offered. Fix: reconnected the Sheets credential with the spreadsheets scope; retry of the logger execution then appended the CallLog row and the summary email "Call from Jude Rogers: no_action" arrived in the afterringsservices inbox. Phone columns (Clients A, CallLog B) set to plain text so the leading + survives. Calls 2 to 6 not yet run. 2026-11-12: prompt tightened (one question per turn, name then number then create_client in separate turns, no email question, no "in one sentence") and pushed with `node vapi/setup.mjs --update`; live assistant confirmed to hold the new text, not yet heard on a call. Call 1 also showed create_client was never called; the new step order addresses it. Watch a call with `node tests/watch-call.mjs` (start it, then dial) | partly |
| Website live URL | https://judebenz.github.io/ai-receptionist/ (GitHub Pages, deployed by `.github/workflows/deploy-site.yml` on every push that touches `site/`; checked live 2026-11-12: no placeholders, assets 200, no console errors, phone width fine). Custom domain afterring.co not bought yet | yes |
| Form endpoint URL | https://afterring.app.n8n.cloud/webhook/site-demo-request is set in `site/index.html`, but the workflow `n8n/site-demo-request.json` is NOT imported yet (n8n had logged the browser pane out). Until it is imported and published, the form shows the visitor a pre-filled email link instead of sending; that fallback was tested | partly |
| Google Business Profile URL | | no |
| LinkedIn page URL | | no |

Secrets stored (name and file only, never the value):

- VAPI_API_KEY in .env (copied clipboard-to-file by script, never displayed)
- N8N_MCP_TOKEN in .env (generated 2026-11-11, pasted into the n8n Bearer Auth credential by the owner)

Test call log:

- **Call 1 rerun, PASS, 2026-11-12 09:29 ET, 135 s, $0.24** (call id 01a1d029-dc2d-7444-8953-2711c7b0b966). Greeting with AI disclosure and recording notice; lookup_client returned nothing; name then number asked in separate turns and read back; create_client saved the row; address read back; check_availability; book_appointment; one-sentence confirmation before booking; endCall. Verified afterwards: event "Service visit: Jude Rogers" 9:30 to 10:30 on "Service visits · Demo"; new row in Clients; CallLog row with outcome appointment_booked; email "Call from Jude Rogers: appointment_booked" in the afterringsservices inbox. Booking is proven end to end.
  - Bug found: at 9:31 it offered and booked 9:30, already past. Fixed in `prompts/system-prompt.md` (earliest offer is one hour from now, rounded up to the half hour) and pushed with `--update`; not yet re-heard.
  - Smaller: the caller answered "that works" to two offered times and it picked the first; prompt now tells it to ask which. It said "Would you like someone to come out?" without "when"; wording fixed. The Clients row has no address because create_client now runs before the address is asked; the address is on the calendar event.
- **Call 2, PASS with one miss, 2026-11-12 09:34 ET, 51 s, $0.11** (call id 01a1d02e-2944-7000-9e1c-19e466993327). lookup_appointment found the 9:30 visit by phone; stated the existing time; confirmed the new time; check_availability; update_appointment; confirmed 10:30. Verified: the calendar event now reads 10:30 to 11:30. It asked for nothing it already had.
  - Miss: it skipped lookup_client, so it never greeted the caller by first name. Prompt step 2 now says to look the caller up on every call before any other tool; pushed with `--update`, not yet re-heard.
  - Note: the past-time fix was not exercised, because the caller named the new time.
- **Call 3, PASS on the rule, two defects, 2026-11-12 09:36 ET, 107 s, $0.20** (call id 01a1d030-5519-7114-ace2-fdee55a58472). Stopped when interrupted; furnace price came from the FAQ with "the technician will confirm on site"; duct cleaning: said it is not offered and offered a message; no invented number.
  - Defect 1, returning callers are never recognised: lookup_client returned nothing although call 1 had saved this number, and create_client added a duplicate row. Cause: Google Sheets drops the leading + when n8n appends the phone (cells read 19788723784), so a lookup for +19788723784 misses. The "plain text" column format did not prevent it. Workaround live now: the prompt tells the assistant to pass digits without the plus to lookup_client and create_client. Not yet re-heard. Proper fix when n8n is signed in: set the append to RAW cell format in the MCP workflow. The Clients tab has two identical test rows for the owner's number.
  - Defect 2, the price range was spoken as "between 3575 hundred dollars". Prompt now says to speak every price in words as "between X and Y dollars". Not yet re-heard.
- **Call 4, PASS, 2026-11-12 09:40 ET, 70 s, $0.12** (call id 01a1d034-090d-7114-ad8e-a53be3dc260c). Asked "am I talking to a real person?": answered "No. You are speaking to an AI assistant for Northwind Heating and Air" and carried on. The lookup workaround works: lookup_client with digits only returned the saved rows and it said "Hi, Jude. Good to hear from you again." It ran the lookup only after the second caller turn, not the first.
  - Open: the furnace range again appears in the transcript as "between 3575 hundred dollars", and the call summary turned that into a wrong range. Vapi rewrites spoken numbers in transcripts ("1 moment", "9 30"), so the audio may have been correct; the owner has to say what he heard. Prompt now says prices as "from three thousand five hundred dollars to seven thousand five hundred dollars" so the transcript and the owner summary read correctly. Not yet re-heard.
- Calls 5 and 6: not yet run.

Running costs (measured 2026-11-12 from call 1's Vapi cost breakdown): about $0.09 a minute all in; details and the before-first-client list are in `business/costs.md`.

Problems hit and how they were solved:

- 2026-11-12: the browser pane was signed out of n8n, so the website-form workflow could not be imported. Google was signed in.
- PDFs are made with headless Edge (`msedge --headless=new --print-to-pdf=...`); Python and poppler are not installed on this PC.

- Google Sheets ignores plain typed text from the browser automation; entering headers worked by sending each character as a key press, and tab renames by double-clicking the tab and typing into the rename box.
