# What AfterRing costs to run

Written 2026-11-12. Per-minute figures are measured from the cost breakdown Vapi returned for the first test call (111 seconds, $0.1663), not from blog posts. Fixed prices were read from vapi.ai/pricing and n8n.io/pricing the same day. Re-check both pages before quoting a large client.

## Per minute of receptionist talk

| Piece | Per minute | Notes |
|---|---|---|
| Vapi platform fee | $0.050 | fixed by Vapi |
| Model (OpenAI GPT-4.1) | $0.021 | grows a little on long calls: the whole conversation is re-sent each turn |
| Transcription (Deepgram Nova 3) | $0.010 | |
| Voice (Vapi Clara) | $0.008 | a premium voice would roughly double this line |
| Phone line (Vapi number) | $0.000 | an imported Twilio number adds about $0.008 inbound |
| **Total** | **about $0.09** | **budget $0.10** |

Rule of thumb: a missed call runs about 3 minutes, so **every missed call per day costs about $9 a month**.

## Fixed monthly costs

| Item | Today | With paying clients |
|---|---|---|
| n8n Cloud | trial until 2026-11-25, then Starter: 20 EUR a month billed yearly (about 24 monthly), 2,500 runs | Pro: 50 EUR a month billed yearly, 10,000 runs |
| Vapi plan | $0: one number (the demo line), 4 calls at once | Core $29: 5 numbers, 10 calls at once. Extra concurrent line $10 |
| Domain | none yet | afterring.co, about $15 a year |
| Website hosting | $0 (GitHub Pages) | $0 |
| Booking link | none yet | $0 (Calendly or Cal.com free) |
| **Total** | **about $0, then about $26** | **about $85** |

One answered call uses about three n8n runs (lookup, booking tools, end-of-call log). Starter's 2,500 runs cover roughly 800 calls a month across all clients.

## What a client costs at different volumes

| Client volume | Minutes a month | Usage cost | Margin at Starter $297 | Growth $497 | Pro $997 |
|---|---|---|---|---|---|
| 5 missed calls a day | 450 | $45 | $252 | $452 | $952 |
| 10 missed calls a day | 900 | $90 | $207 | $407 | $907 |
| 200 minutes a week | 870 | $87 | $210 | $410 | $910 |
| 25 missed calls a day | 2,250 | $225 | $72 | $272 | $772 |
| 50 missed calls a day | 4,500 | $450 | loss | $47 | $547 |
| 2,000 minutes a week | 8,700 | $870 | loss | loss | $127 |

Margins are before the fixed costs above and before your own time.

## When to quote custom

Owner's decision (2026-11-12): the three flat plans stay as published, and very large clients are priced individually.

- Up to 25 missed calls a day: any plan.
- 25 to 50 a day: Growth or Pro, not Starter.
- Over 50 a day, or several lines ringing at once: custom quote. Start from usage cost times three.
- The site and one-pager say "normal inbound call volume under fair use". Put the actual limit for each client in their service agreement so the phrase has a number behind it.

## Before the first paying client goes live

1. **Vapi Core, $29 a month.** The free tier has one number and the demo line is using it. Each client needs their own.
2. **n8n paid plan** before the trial ends on 2026-11-25, or every workflow stops, including the demo and the website form.
3. **A way to take payment.** Stripe account with three payment links (Starter, Growth, Pro). Needs a bank account.
4. **The service agreement** (`sales/service-agreement-template.md`) read by a lawyer once, with the fair-use limit filled in.
5. **Text alerts are sold on Growth but cannot be sent yet.** Texting from software in the US needs 10DLC registration, which takes days to weeks and needs a registered business. Until then, Growth clients get email summaries; say so, or register first.
6. A business phone line of your own (Google Voice, free) and the domain, so the site and emails stop showing a Gmail address and a github.io URL.
