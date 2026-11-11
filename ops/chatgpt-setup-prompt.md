# Prompt for ChatGPT: do the account setup

Paste everything below the line into ChatGPT (agent mode or a browsing-capable model works best, since most steps happen on websites you are signed in to). Everything it needs is in the repo under `handoff/`; the prompt tells it where to look. If the repo is private and ChatGPT cannot open it, either sign in to GitHub in its browser or paste the files it names. When it finishes, paste its filled status table back to Claude Code so the repo can be updated.

---

You are helping me set up the accounts and services for a small business called **AfterRing**, an AI phone receptionist for HVAC companies, plumbers and small law firms in Massachusetts. It answers only the calls a business misses, books the job on a calendar, and emails the owner a summary. The software is already built: a Vapi assistant definition, two n8n workflows, a setup script, a website and a sales kit. What is missing is every account, key, number and domain, because those need me logged in. That is your job: walk me through each step in order, do the clicking where you can in sites I am signed in to, and collect the resulting values.

## Where to look

Everything you need is in my GitHub repository: `https://github.com/JudeBenz/ai-receptionist`. Raw files are at `https://raw.githubusercontent.com/JudeBenz/ai-receptionist/main/<path>`. Read these first, in this order, and do not ask me for anything they already answer:

1. `handoff/README.md`: the file map.
2. `handoff/facts.json`: every non-secret fact (brand, domain, email to create, DNS records, Google names and sheet headers, n8n and Vapi steps, pricing, the six test calls).
3. `.env.example`: the lines I will fill on my computer with secrets.
4. `n8n/receptionist-mcp-server.json` and `n8n/end-of-call-logger.json`: the two workflows to import.
5. `tests/test-calls.md`: the test calls and pass criteria.
6. `README.md`: how the Vapi assistant is created by script.

If the repository is private and you cannot read it, tell me, and I will either sign in to GitHub in your browser or paste the file you name. Do not guess at file contents.

When you finish, fill in `handoff/status-template.md` as a table and give it to me to paste back.

## Rules

1. Never ask me to paste an API key, password or token into this chat. When a step produces a secret, tell me exactly which line of which `.env` file to put it on and move on.
2. Confirm with me before anything that costs money, and state the price first. Nothing here should cost more than about $15 up front except optional paid tiers.
3. Prefer free tiers. Note where a free tier will run out.
4. The receptionist is inbound only and always discloses it is an AI and that calls may be recorded. Massachusetts is an all-party consent state. Do not set up anything that places outbound calls or sends marketing texts.
5. If a site's layout differs from what you expect, describe what you see and ask rather than guessing.
6. At the end, give me a single "values collected" table (see the bottom) with every non-secret value, and a list of every secret I stored and where.

## Step 1: domain and email (30 minutes)

- Check that `afterring.co` is still available and buy it at Cloudflare Registrar or Porkbun (confirm price first, about $10 to $15 a year). If `.co` is gone, propose three alternatives and stop.
- Set up business email on that domain: Google Workspace Business Starter (about $7 a month) if I want Google Calendar and Sheets under the same account, which I do. Create `hello@afterring.co` as the main mailbox.
- Add the DNS records Google gives you: MX, SPF (`v=spf1 include:_spf.google.com ~all`), DKIM, and a DMARC record (`v=DMARC1; p=none; rua=mailto:hello@afterring.co`). Verify the domain.
- Values to collect: domain registrar, mailbox address, DNS verified yes/no.

## Step 2: numbers and booking (20 minutes)

- A number for my own outbound sales calls: Google Voice (free, US) on the new Google account, or tell me if Voice is not available on Workspace Starter and suggest the cheapest alternative.
- A booking link: Calendly or Cal.com free plan, one event type "AfterRing demo, 15 min", availability Thursday and Friday 9 to 5 Eastern, buffer 15 minutes.
- Values to collect: my outbound number, the booking link URL.

## Step 3: Google calendar and sheet for the demo receptionist (15 minutes)

In the new Google account:
- Create a calendar named `Service visits · Demo`. Open its settings and copy its Calendar ID (looks like `xxxx@group.calendar.google.com`).
- Create a Google Sheet named `Demo · Receptionist CRM` with the two tabs and exact headers listed under `google_demo_resources` in `handoff/facts.json` (also in `n8n/google-sheet-layout.md`). Copy the sheet ID from its URL (the long string between `/d/` and `/edit`).
- Values to collect: calendar ID, sheet ID.

## Step 4: n8n (45 minutes)

- Create an n8n account. n8n Cloud has a free trial and then starts at about $24 a month; self-hosting is free but needs a server with a public URL. Recommend Cloud for the first client and tell me the trial length.
- Import the two workflow files from the repo, `n8n/receptionist-mcp-server.json` and `n8n/end-of-call-logger.json` (Workflows, Import from URL using the raw link, or Import from file after I download them).
- In the first workflow, every tool node needs: the Google Calendar or Google Sheets credential (create one Google OAuth credential by signing in with the new Google account and reuse it everywhere), the calendar from step 3, and the sheet and tab `Clients`. Open the node named `MCP Server Trigger`, set authentication to Bearer Auth, create a credential whose token is a long random string (generate one, tell me to store it as `N8N_MCP_TOKEN` in `.env`, never show it here again), save, activate the workflow, and copy the **Production URL** shown on the trigger. Note whether the URL ends in `/sse`.
- In the second workflow: the Google Sheets node gets the sheet and tab `CallLog`; the Gmail node gets a Gmail OAuth credential on the same account and the recipient `hello@afterring.co`; the Webhook node, once activated, shows a Production URL. Copy it.
- Values to collect: n8n plan and trial end date, MCP production URL, whether it ends in /sse, webhook production URL.

## Step 5: Vapi (30 minutes)

- Create an account at vapi.ai. Note the free credit and the per-minute pricing you see.
- Organization settings, API keys: create a private key. Tell me to put it on the `VAPI_API_KEY` line of `.env` and do not display it.
- Phone Numbers: create a free Vapi US number (up to 10 per account). Copy the number.
- Do not create the assistant by hand. I will run `node vapi/setup.mjs` on my computer once `.env` has: `VAPI_API_KEY`, `N8N_MCP_URL`, `N8N_MCP_PROTOCOL` (sse or shttp), `N8N_MCP_TOKEN`, `VAPI_SERVER_URL`, `TRANSFER_NUMBER` (my cell in +1 format), `OWNER_EMAIL`. Walk me through filling those lines, then tell me to run `node vapi/setup.mjs --dry-run` and then `node vapi/setup.mjs`, and to paste you the assistant ID it prints.
- Back in Vapi: Phone Numbers, the new number, inbound settings, choose that assistant, and set the fallback destination to my cell.
- Values to collect: Vapi number, assistant ID, pricing you observed.

## Step 6: test calls (20 minutes)

Have me call the Vapi number from my phone and run these six, one at a time, and after each check the calendar, the sheet and the summary email: (1) new caller books a visit, (2) same caller moves it an hour later, (3) interrupt it and ask for a price it does not have, (4) ask if it is a robot, (5) refuse to give a name and demand a person, (6) say "I smell gas". Record pass or fail for each. Anything that fails, note exactly what it said.

## Step 7: website (30 minutes)

- Host the `site/` folder as a static site. Easiest: Netlify Drop (drag the folder) or Cloudflare Pages. Then point `afterring.co` at it (CNAME or the host's instructions) and enable HTTPS.
- Create a free form endpoint at Formspree, Basin or Web3Forms with `hello@afterring.co` as the recipient. Give me the endpoint URL; I will paste it into the `BRAND.formEndpoint` line in `site/index.html` and also update the phone, demo number and email in the same `BRAND` block, then redeploy.
- Values to collect: hosting provider, live URL, form endpoint URL.

## Step 8: presence (30 minutes)

- Google Business Profile for AfterRing, category "Telephone answering service", website and phone from above, service area Massachusetts.
- LinkedIn company page: name AfterRing, tagline "The receptionist that answers when yours can't", website, industry "Telecommunications".
- Values to collect: both URLs.

## Later, not today (tell me the steps, do not start them)

- Massachusetts single-member LLC and EIN, then a business bank account.
- Stripe account and three payment links (Starter $297, Growth $497, Pro $997 per month).
- 10DLC registration before any SMS follow-ups.

## Values collected (fill this at the end)

Use the table in `handoff/status-template.md`. Every non-secret value goes in it; secrets are listed by name and file only.

Start by reading the files under "Where to look", then begin step 1. Before each step, tell me what you are about to do and what it will cost.
