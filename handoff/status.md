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
| Vapi assistant ID | | no |
| Vapi pricing seen | | no |
| Test calls passed (of 6), notes on failures | | no |
| Website live URL | | no |
| Form endpoint URL | | no |
| Google Business Profile URL | | no |
| LinkedIn page URL | | no |

Secrets stored (name and file only, never the value):

- N8N_MCP_TOKEN in .env (generated 2026-11-11, pasted into the n8n Bearer Auth credential by the owner)

Problems hit and how they were solved:

- Google Sheets ignores plain typed text from the browser automation; entering headers worked by sending each character as a key press, and tab renames by double-clicking the tab and typing into the rename box.
