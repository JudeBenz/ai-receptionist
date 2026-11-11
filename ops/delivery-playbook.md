# Client delivery playbook: from "yes" to day 30

What happens after an owner says yes. Each step names the file or script that does the work. Times assume you have done it once before; double them for the first client.

## The shape of the system

One Vapi assistant, one Vapi phone number, one n8n MCP workflow, one n8n call-logger workflow, one Google calendar and one Google Sheet **per client**. Nothing is shared between clients except your accounts. A client's folder in `clients/<slug>/` holds everything about them, and the scripts generate their assistant and workflows from it.

The client keeps their existing phone number. Their carrier forwards unanswered calls to the client's Vapi number after a set number of rings. That is the whole integration. Nothing changes for calls their staff answer.

```
Caller dials the client's number
  -> client's phone rings as normal
  -> no answer after ~15 s (or after hours) -> carrier forwards to the Vapi number
  -> Vapi assistant answers, uses the client's n8n tools (calendar, sheet)
  -> end-of-call report -> n8n -> CallLog sheet + summary email/text to the client
```

## Day 0: the yes (30 minutes)

1. Send the welcome email (`ops/client-welcome-email.md`) with the onboarding questionnaire (`ops/onboarding-questionnaire.md`) and the agreement (`sales/service-agreement-template.md`, lawyer-reviewed).
2. Book the 30-minute kickoff call for within 3 business days.
3. Create the client folder: `node scripts/new-client.mjs "Acme Plumbing"`.

## Day 1 to 3: kickoff and build (2 to 3 hours)

4. On the kickoff call, fill the questionnaire together. Get the three things people forget: the hand-over number, who receives summaries, and the questions callers always ask.
5. Fill `clients/<slug>/business.json` and `clients/<slug>/business-faq.md` from the questionnaire. Every price and policy must come from the client, never from you.
6. Google: in your agency Google account, create a calendar `Service visits · <Client>` and share it with the client's email (make changes to events). Create a sheet `<Client> · Receptionist CRM` with the two tabs from `n8n/google-sheet-layout.md` and share it view-only with the client. Put the calendar id and sheet id in `business.json`.
7. n8n: `node scripts/n8n-for-client.mjs <slug>` writes two workflow files into `clients/<slug>/n8n/`. Import both, pick your Google and Gmail credentials, create a Bearer credential for the MCP trigger, activate both. Copy the MCP production URL and the webhook URL into `clients/<slug>/.env`.
8. Vapi: `node vapi/setup.mjs --client <slug>` creates the assistant. In the dashboard, create a phone number, assign the assistant inbound, and set its fallback destination to the client's hand-over number so a Vapi outage still rings a human.
9. Put the Vapi number, assistant id and file id into `clients/<slug>/.env` (the script prints them).

## Day 4 to 7: test (1 hour, then the client's 30 minutes)

10. Run the six calls in `tests/test-calls.md` against the client's Vapi number from your own phone. Check calendar, sheet, summary email. Fix the FAQ or prompt, `node vapi/setup.mjs --client <slug> --update`, repeat until all six pass.
11. Send the client the Vapi number and ask them and one staff member to call it and try to break it. Collect what confused it. Fix and update.
12. Walk the client through `ops/staff-one-pager.md` so the front desk knows what happens and what the summaries look like.

## Day 7: go live (30 minutes with the client on the phone)

13. Follow `ops/go-live-checklist.md`: set conditional forwarding on the client's phone, test from a third phone, confirm caller ID passes through, confirm the summary lands.
14. Start the pilot clock. Put the go-live date in `business.json`.

## Days 8 to 30: run it

15. Daily for the first week: read every transcript in the Vapi call log. Add facts to the FAQ, tighten prompt rules, push with `--update`. Most clients need three or four updates in week one and almost none after.
16. Weekly: send the report from `ops/weekly-report-template.md` (calls answered, booked, messages, anything to fix). Keep it to five lines.
17. Watch for: dead air before tool calls, callers asking for a person and not getting one, wrong times (timezone), anything the assistant said that was not in the FAQ.
18. If n8n is down the assistant still talks, takes messages and transfers; booking fails gracefully by the prompt's rule 6. If Vapi is down the fallback destination rings the hand-over number. Check both monthly.

## Day 30: review and renewal (30 minutes)

19. Fill `ops/day-30-review.md` from the CallLog sheet: calls answered, after-hours calls, appointments booked, messages taken, estimated value using the owner's own average job figure.
20. If it booked at least one job, the pilot converts: send the Stripe payment link for the plan, confirm the date billing starts, keep going. If it did not, end it cleanly, remove forwarding, and ask what would have made it work.

## Things that go wrong, and the fix

| Problem | Cause | Fix |
|---|---|---|
| Caller ID shows the client's own number | Some carriers replace caller ID on forward | Ask the carrier to enable caller-ID passthrough; otherwise the assistant asks for the number, which the prompt already handles |
| Assistant offers times outside hours | Hours missing or ambiguous in business.json | Write hours as exact ranges per day |
| Booked at the wrong hour | Timezone | business.json timezone must match the calendar's timezone |
| Five seconds of silence before an answer | Tool latency, no holding line | The prompt's holding-line rule; check n8n execution time |
| Assistant quotes a price it should not | FAQ has a number the client did not want quoted | Remove it; add it to "things not to promise" |
| Summaries not arriving | Server URL wrong or workflow inactive | Check `VAPI_SERVER_URL` in the client .env and that the logger workflow is active |
| Client's staff hang up on forwarded calls | They did not know | Staff one-pager; the forwarded call shows as the Vapi number on transfer |

## What to charge for and what to include

Set-up is included in the plan. Changes to hours, services and FAQ are included within two business days. A second line, a second location, or a custom integration is priced separately. Say this in the welcome email so it is never a surprise.
