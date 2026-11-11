# AI voice receptionist: analysis of three videos for a pitch deck and a build

Captured 2026-11-10 from YouTube auto-captions. Full transcripts sit next to this file (01, 02, 03).

| # | Video | Creator | Length | What it really is |
|---|-------|---------|--------|-------------------|
| 1 | How to Make AI Receptionist & Sell It for $497 Per Client | AI Master | 12 min | Unit economics and a HighLevel build. Sponsored by HighLevel. |
| 2 | I Built an AI Voice Receptionist with Vapi and n8n MCP | Nate Herk | 34 min | Technical architecture, live demo, free templates. Funnel for a Skool community. |
| 3 | How I Sell AI Receptionists to Local Businesses | Whitney Bonds | 13 min | Sales script and positioning. Funnel for a HighLevel affiliate trial and coaching. |

Read the three together and they cover exactly the three parts a deck needs: the money (1), the product (2), and the story a buyer hears (3).

## 1. Trust level of the numbers

All three creators earn from the tools or communities they recommend. Treat every revenue claim as marketing. The one third-party statistic cited is the "2024 study of 85 small businesses" where about 38 percent of calls were answered by a person. Verify that study before it goes on a slide. The pricing facts about HighLevel, Vapi and Retell are plausible for mid-2026 but move often; AI Master himself says HighLevel repriced AI twice in a year. Check the live billing pages before quoting them.

## 2. The problem, as the videos frame it

- Roughly six in ten calls to a small business go unanswered (video 1).
- Three quarters of callers never call back after one unanswered call, and about six in ten dial a competitor instead (video 1).
- "People don't leave voicemails anymore" (video 3). An urgent caller, like someone with water in the basement, calls the next plumber on Google.
- The owner's current options are bad: a live answering service costs about 245 to 395 dollars a month for 50 to 100 minutes with overage near 5 dollars a minute, and a full-time receptionist costs about 3,000 dollars a month loaded (video 1).
- The gap is not "no receptionist." It is the calls the human misses: on a job, after hours, weekends, busy Tuesdays (videos 1 and 3).

## 3. The product, as demonstrated

What the receptionist does on the call (videos 2 and 3):

- Answers with a business-specific greeting and identifies itself as AI (both creators recommend disclosure up front).
- Identifies the caller (by email in Nate's build, by name and address in Whitney's demo) and creates a CRM record for new callers after reading back the details.
- Checks calendar availability, books, reschedules and cancels appointments.
- Answers FAQs from an uploaded policies document and refuses to make things up.
- Transfers to a human number or hands off to a specialised AI assistant (sales, support).
- Falls back to voicemail or a human when stuck. AI Master: a dead-end call is what makes an owner rip the system out two weeks in.

What the owner gets after the call (videos 2 and 3):

- An email or SMS with a two-to-three sentence summary, the transcript, and a structured outcome such as "appointment booked" or "rescheduled".
- CRM rows: client, appointment log, call log.

How it is built:

| | HighLevel (videos 1 and 3) | Vapi plus n8n (video 2) |
|---|---|---|
| Who it suits | Agency selling to many clients | Builder who wants control and lowest cost |
| Voice layer | HighLevel AI Employee | Vapi with GPT-4.1 |
| Logic | Built-in prompt, knowledge base, calendar | n8n MCP server with 7 single-purpose workflows, no AI in the backend |
| Fixed cost | 497 dollars a month Agency Pro to rebill with markup, plus 97 dollars per client sub-account | Vapi usage only; 10 free US numbers per account |
| Per-minute cost | About 7 to 23 cents all-in | About 5 cents entry for voice, 13 to 35 cents with telephony and model |
| Scaling | Snapshots clone a working agent to the next client in minutes | Copy workflows and prompt per client |
| Build time claimed | "Less than 10 minutes" (Whitney) | About 2 hours live build (Nate) |

Nate's design rules are worth stealing for the technical slide:

- Wireframe the call flow before prompting. Every branch is "if X do Y".
- One brain only. The voice agent reasons; the backend is deterministic. Two reasoning layers double cost, latency and errors.
- Each tool does one thing and carries a plain-language description so the agent picks correctly.
- Say "let me check on that" before every tool call, or the caller hears five seconds of silence.
- Confirm name spelling, email and number before writing to the CRM.
- Prompting is iterate-and-test. He was on version 50 of the prompt.

AI Master's testing rule: call your own agent five or six times as a difficult customer, interrupting, changing your mind, asking for a price it does not have, then check the CRM, calendar and transcript.

## 4. The money

| Item | Figure | Source |
|---|---|---|
| Market rate buyers already pay | 25 to 48 cents a minute | video 1 |
| What AI Master charges | 40 cents a minute framing, invoiced as a flat 297 to 497 dollars a month | video 1 |
| What Whitney charges | 997 dollars a month to an HVAC owner; 497 dollars a month to a law firm | video 3 |
| Community price points claimed | 397, 497, 1,297 dollars a month | video 3 |
| Cost per client (HighLevel) | 97 dollars a month unlimited inbound, plus usage | video 1 |
| Cost of 10 clients (HighLevel) | About 970 dollars a month in AI fees before the 497 dollar plan | video 1 |
| Rebilling levers | Markup slider up to 2.5x, or fixed rate such as 10 cents a minute | video 1 |

Framing rules from the videos:

- Per minute is the framing, one flat monthly number is the invoice. Owners want predictability.
- Sell the outcome (missed calls that stop leaking) so price stops being the conversation.
- "You're selling the spread, not the software."
- Keep standard voices. Premium voices double the per-minute cost and callers do not notice on a two-minute booking call.

## 5. The sale (Whitney's script, which is the strongest content of the three)

Target businesses by three tests: are calls valuable, does the caller have urgency, and would one missed customer cost more than the monthly fee. Her picks: HVAC, law firms, plumbers. AI Master's example client is a plumber.

Lead source: ask your own contacts "who do you know who owns an HVAC company or is a lawyer" rather than cold outreach. Her 497 dollar law-firm client came from a friend whose son plays football with a lawyer's son.

The discovery call, in order:

1. "My sister goes to your med spa and said you might help me. Can I ask a few quick questions for some research?"
2. "I just started a business and people say this would be good for med spas, but I'm not sure. Do med spas actually miss many calls?"
3. "About how many a day?"
4. "What's an average sale?"
5. Do not compute the loss for them. Ask "How many of those would normally turn into appointments if someone answered?" and let the owner say the number.
6. "Do you think local med spas would be interested in something like this?" Then stop talking.
7. "Do you know anybody who could use this?"

When they want to see it: no 50-slide presentation. Give them the demo number and let them call it and try to confuse it. Then ask what happens when someone calls, what callers ask, what information they need, when to book, when to transfer. Then: agree solution and price, build, test, launch, monitor.

Positioning lines to reuse: "We're not selling a cool AI that talks. We help owners capture opportunities that slip through the cracks." "If a human can answer, let them. This catches what they drop." AI Master's version: configure it to answer only after the front desk misses the call for 15 seconds, so you are not replacing anyone.

## 6. Compliance points the deck should not skip (video 1)

- The agent says it is AI when asked (California's bot law and similar).
- Every call opens with a recording notice; about a dozen states require all-party consent.
- Register 10DLC before sending any SMS follow-up. Campaign review takes 10 to 15 days.
- Inbound only. Outbound AI dialing is a different TCPA risk.

## 7. What the videos leave out

- No retention or churn data. Nobody says how long clients stay.
- No real call volume per client, so the per-minute margins are theoretical.
- No handling of Spanish or multilingual callers (AI Master says do not sell it yet).
- Nothing on accents, background noise, or latency on real phone lines versus the browser demo.
- No contract, SLA or liability language for when the agent books something wrong.

## 8. Recommended deck (10 slides, built around a live demo number)

1. Title: business name, one line: "The receptionist that answers when yours can't."
2. The leak: six in ten calls unanswered, three quarters never call back. Cite the study once verified.
3. What it costs today: answering service vs. full-time hire vs. missed jobs.
4. Call the demo: a phone number on the slide. Pause the deck and let them call.
5. What the owner gets: summary email, transcript, booked appointment, CRM row. Screenshot of one real end-of-call report.
6. How it fits: human first, AI after 15 seconds or after hours. Transfers to a human any time.
7. Who it is for: HVAC, plumbing, law firms, and why those three.
8. Pricing: one flat monthly number per tier (for example 297, 497, 997), what is included, no per-minute surprise.
9. Trust and compliance: AI disclosure, recording notice, no outbound dialing, data stays in their CRM.
10. Next step: 30-day pilot on their existing number, we build and test it, they keep it if it books one job.

If the deck is for investors rather than business owners, add three slides: unit economics per client (cost 97 to 150 dollars, price 297 to 997), the HighLevel-versus-own-stack decision, and a market slide sized from local service businesses in the target region.

## 9. Recommendation for the build

Start on Vapi plus n8n using Nate Herk's free templates. It gives a working demo number at no fixed monthly cost, which is what the deck depends on. Move to HighLevel only when there are three or more paying clients and rebilling, snapshots and a shared CRM start to matter, because its 497 dollar plan plus 97 dollars per client is the price of that convenience.
