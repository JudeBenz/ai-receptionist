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
| Test calls passed (of 6), notes on failures | Call 1 (2026-11-11 19:50 ET, 111 s): greeting, AI disclosure, name/number/address read-back all correct; lookup_client returned "resource not found" because the Sheets consent had been granted without the Sheets scope; caller hung up before a slot was offered. Fix: reconnected the Sheets credential with the spreadsheets scope; retry of the logger execution then appended the CallLog row and the summary email "Call from Jude Rogers: no_action" arrived in the afterringsservices inbox. Phone columns (Clients A, CallLog B) set to plain text so the leading + survives. Calls 2 to 6 not yet run | partly |
| Website live URL | | no |
| Form endpoint URL | | no |
| Google Business Profile URL | | no |
| LinkedIn page URL | | no |

Secrets stored (name and file only, never the value):

- VAPI_API_KEY in .env (copied clipboard-to-file by script, never displayed)
- N8N_MCP_TOKEN in .env (generated 2026-11-11, pasted into the n8n Bearer Auth credential by the owner)

Problems hit and how they were solved:

- Google Sheets ignores plain typed text from the browser automation; entering headers worked by sending each character as a key press, and tab renames by double-clicking the tab and typing into the rename box.
