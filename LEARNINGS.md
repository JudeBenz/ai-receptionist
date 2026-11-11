# What we learned

Notes from researching and building an AI phone receptionist for local service businesses, 10 November 2026. The research is three YouTube videos (transcripts and a full analysis in `research/`); the build is the Vapi plus n8n project in this repository; the sales deck source is in `deck/`.

## The business, in one paragraph

Roughly six in ten calls to a small business ring out, most callers never call back, and many call a competitor instead. The owner's alternatives are an answering service that runs out of minutes or a salary. An AI receptionist that answers only the calls a human misses, books the job and sends the owner a summary is sold as a flat monthly fee, typically 297 to 997 dollars, against a per-client cost of roughly 100 to 150 dollars a month plus minutes. The spread is the business. Nobody in the three videos has audited revenue numbers, and all three are selling a tool or a community, so treat their figures as marketing.

## Who to sell to, and how

- Three tests for a vertical: a phone call is worth real money, the caller is urgent, and one missed customer costs more than the monthly fee. HVAC, plumbing and law firms pass all three.
- Find owners through your own contacts: ask "who do you know who knows a plumber?" rather than cold outreach.
- The discovery call asks questions and never pitches: do you miss calls, how many a day, what is an average job, how many would have booked. Let the owner say the number; never compute their loss for them.
- When they want to see it, hand them the demo number and let them try to break it. No slide show first.
- Position it as catching what the human drops, not replacing anyone. Offer "answers after 15 seconds unanswered" and after-hours coverage.
- Invoice one flat monthly number. Per-minute is only the internal framing.

## How to build it

- Two layers only. The voice platform (Vapi) is the single reasoning layer; the backend (n8n) runs deterministic tools with no AI in them. Two reasoning layers double latency, cost and errors.
- Expose the backend as one MCP server with single-purpose tools, each with a plain-language description. The voice model picks the tool from the description; you never define parameters twice.
- Identify callers by caller ID, not by asking them to spell an email on the phone.
- Keep appointments in the calendar as the single source of truth, with the caller's phone number in the event, so lookups are a text search.
- The prompt is a call-centre script: identity, speaking style, hard rules, then "if this, do that" branches. Expect fifty iterations. A holding line before every tool call avoids five seconds of dead air.
- Standard voices and a mid-tier model are enough for a two-minute booking call; premium voices double the per-minute cost and callers do not notice.
- Always set a fallback to a human or voicemail. A dead-end call is what makes an owner cancel in week two.
- Test by calling your own agent as a difficult customer, at least six times, and read the transcripts for every hesitation.

## Compliance you cannot skip

- The agent discloses that it is an AI in the greeting and whenever asked.
- Every call opens with a recording notice; about a dozen US states require all-party consent.
- Register 10DLC before any SMS follow-up; campaign review takes 10 to 15 days.
- Inbound only. Outbound AI dialing is a different legal regime under the TCPA.

## Platform choice

HighLevel (two of the three videos) bundles voice, CRM, snapshots and rebilling but needs the 497 dollar agency plan plus 97 dollars per client before the margin exists. Vapi plus n8n (the third video, and this build) has no fixed platform fee, gives free demo numbers, and costs a few cents a minute, at the price of wiring the CRM and calendar yourself. Start on Vapi for the demo and the first clients; move to HighLevel only if the agency features start paying for themselves.

## What is still unverified

- The "2024 study of 85 small businesses" behind the call-answer statistics is cited in the videos but not located. Verify it before it goes on a slide.
- The n8n workflows and the Vapi payload in this repository were written against the 2025 node and API schemas and have not been imported or sent from a live account yet. The README lists what to expect.
- No retention or churn data exists for this kind of service in the sources.

## Repository map

- `README.md` setup order for the build.
- `config/`, `prompts/`, `knowledge/` the receptionist's facts and instructions.
- `n8n/` the two importable workflows and the sheet layout.
- `vapi/setup.mjs` creates or updates the assistant from the files above.
- `tests/test-calls.md` the six calls to make before any demo.
- `research/` the three transcripts and the pitch-deck analysis.
- `deck/` the pitch deck source (ten slides, one HTML file each, plus the index). The live deck is a Claude artifact; the files here are the editable source.
- `business/` the working brand config and the launch checklist for the company around the product.
- `sales/` the cold-call script and day plan, call tracker, lead-list template, follow-up emails, one-pager and the service agreement draft.
- `site/` the one-page website, deployable as static files.
