# AI phone receptionist (Vapi + n8n)

An inbound AI receptionist for a local service business. Vapi answers the phone and runs the conversation; n8n exposes seven deterministic tools over MCP (customer lookup, booking, rescheduling, cancelling) against Google Calendar and a Google Sheet; a second n8n workflow logs every call and emails the owner a summary.

The design follows the three videos analysed earlier: one reasoning layer (Vapi), no AI in the backend, single-purpose tools with plain descriptions, a holding line before every tool call, AI disclosure and a recording notice in the greeting, and a hard rule against inventing prices.

```
receptionist/
  config/business.json          business facts the prompt is rendered from
  prompts/system-prompt.md      the receptionist's instructions ([[tokens]] come from business.json)
  knowledge/business-faq.md     the only facts the receptionist may quote
  n8n/receptionist-mcp-server.json   MCP Server Trigger + 7 tools (import into n8n)
  n8n/end-of-call-logger.json        webhook -> CallLog sheet -> email (import into n8n)
  n8n/google-sheet-layout.md         the sheet tabs and headers
  vapi/setup.mjs                creates/updates the Vapi assistant from the files above
  tests/test-calls.md           the six calls to make before showing anyone
  .env.example                  copy to .env
  clients/                      one folder per client (scaffold: scripts/new-client.mjs)
  scripts/                      new-client.mjs, n8n-for-client.mjs
  ops/                          delivery playbook, questionnaire, go-live checklist, report templates
```

## What you need

- A Vapi account with a private API key. Vapi gives up to 10 free US numbers per account.
- An n8n instance reachable from the internet (n8n Cloud, or self-hosted behind a public URL). Vapi must be able to call it.
- A Google account for Calendar, Sheets and Gmail, connected to n8n as credentials.
- Node 18 or newer on your machine to run the setup script.

## Setup, in order

### 1. Google

1. Create a calendar called `Service visits` (keep personal events out of it).
2. Create a Google Sheet `Receptionist CRM` with the two tabs and headers in `n8n/google-sheet-layout.md`.

### 2. n8n

1. Import `n8n/receptionist-mcp-server.json`. In every tool node, pick your Google credential, the `Receptionist CRM` sheet and the right tab (`Clients`), or the `Service visits` calendar. Check the column mapping on `create_client` after the sheet is selected.
2. Open the MCP Server Trigger node. Create a Bearer Auth credential with a long random token. Copy the Production URL. Activate the workflow.
3. Import `n8n/end-of-call-logger.json`. Pick the Google credential, the sheet and the `CallLog` tab on the append node, and a Gmail credential on the email node. Copy the webhook's Production URL. Activate the workflow.

### 3. Business facts

1. Edit `config/business.json`: name, type, city, timezone, hours, slot length.
2. Edit `knowledge/business-faq.md`: replace every bracketed value and every price with the real ones. Delete anything you do not want the receptionist to say.
3. Read `prompts/system-prompt.md` once. You should not need to change it for a first client.

### 4. Vapi

```bash
cp .env.example .env
```

Fill in `.env`, then:

```bash
node vapi/setup.mjs --dry-run
```

```bash
node vapi/setup.mjs
```

The script uploads the FAQ file, creates the assistant with the MCP tool, the transfer tool, the end-call tool and the knowledge-base query tool, and prints the assistant id. Put that id in `.env`. After any later change to the prompt or FAQ:

```bash
node vapi/setup.mjs --update
```

Then in the Vapi dashboard: Phone Numbers, create a free number, Inbound settings, select the assistant. That number is your demo number for the pitch deck.

### 5. Test

Work through `tests/test-calls.md`. After each call, check the Vapi call log (transcript and tool calls), the calendar, the `Clients` and `CallLog` tabs, and the owner email. Every hesitation in a transcript is a line to add to the FAQ or the prompt.

## Serving a real client

The steps above build the demo. For a paying client, follow ops/delivery-playbook.md: scaffold a folder with scripts/new-client.mjs, fill it from ops/onboarding-questionnaire.md, generate that client's n8n workflows with scripts/n8n-for-client.mjs, create the assistant with vapi/setup.mjs --client <slug>, test, then set call forwarding with ops/go-live-checklist.md.

## How a call runs

1. Vapi plays the first message: who it is, that it is an AI, that the call may be recorded.
2. If caller ID is present, the assistant calls `lookup_client` before asking anything.
3. It sorts the request into book, change or cancel, question, or person.
4. Booking: `check_availability` for the requested day, offer two slots, confirm, `book_appointment`.
5. Questions: `search_business_info` against the FAQ file. If the file does not answer, it takes a message.
6. A person: `transferCall` in business hours, a message otherwise.
7. On hang-up, Vapi posts an end-of-call report to n8n, which appends a `CallLog` row and emails the owner the summary, outcome and recording link.

## Cost per client, roughly

Vapi bills per minute for the platform, the transcriber, the model and the voice, and Vapi numbers carry a small monthly fee. At the rates the source videos quote the all-in cost lands between 5 and 35 cents a minute depending on voice and model; check the Vapi pricing page before quoting anyone. n8n Cloud starts at a flat monthly fee, or is free self-hosted.

## Before a client goes live

- Confirm the greeting discloses AI and recording for every state the client operates in.
- Do not add SMS follow-ups until the client's number has passed 10DLC registration.
- Keep it inbound only. Outbound AI dialing is a different legal regime.
- Set the fallback: if n8n is down, the assistant still takes a message and the transfer still works.

## Known gaps

- The n8n workflow JSON was written by hand against n8n's node schemas as of 2025 and has not been imported into a live instance here. Expect to reselect credentials, the sheet and the calendar in every node, and possibly a field or two that n8n renamed.
- The Vapi payload has not been sent to the Vapi API from this machine. If Vapi rejects a field, the error names it; `--dry-run` shows the exact JSON.
- No SMS confirmation to the caller yet. Add a Twilio or Vapi SMS step after `book_appointment` once 10DLC is done.
- English only.
