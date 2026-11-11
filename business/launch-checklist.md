# Launch checklist: the online business around the receptionist

Ordered by what unblocks what. Times are realistic for one person. Costs are typical US figures as of late 2026; check before paying. Anything marked "you" needs your own accounts, card or identity and cannot be done by an assistant.

## Today, before the first call (about 2 hours)

| # | Item | Who | Time | Cost | Why it matters for "official" |
|---|------|-----|------|------|------|
| 1 | Pick the name. Search it at your state's business-name lookup, the USPTO trademark search, and a domain registrar. | you | 20 min | $0 | You will say it 100 times today. Change it in `business/brand.json` and find-and-replace `EveryCall` across the repo. |
| 2 | Buy the domain (.com if available, else .co). Cloudflare, Porkbun or Namecheap. | you | 10 min | $10 to $15 a year | A Gmail address loses the call before it starts. |
| 3 | Business email on that domain. Google Workspace Starter or Zoho Mail free tier. Set the signature from `sales/follow-up-emails.md`. | you | 30 min | $0 to $7 a month | Every follow-up email today comes from it. |
| 4 | A business phone number for your own calls. Google Voice (free, US) or a second Vapi number forwarded to your cell. Put it in `brand.json`. | you | 15 min | $0 to $2 a month | Owners call back the number that called them. |
| 5 | Booking link. Calendly or Cal.com free plan, a 15-minute "Demo" event, Thursday and Friday slots open. | you | 15 min | $0 | You book demos on the phone in one sentence. |
| 6 | Lead list: 120 businesses. Google Maps searches for "hvac contractor", "plumber", "law office" in your area, into `sales/lead-list-template.csv`. Skip franchises and anything with a call centre. | you | 45 min | $0 | 100 dials needs 120 numbers; some are dead. |

## This week (demo must exist before the first demo call)

| # | Item | Who | Time | Cost |
|---|------|-----|------|------|
| 7 | Receptionist live on a Vapi number: follow `README.md` steps 1 to 5. The six test calls in `tests/test-calls.md` before anyone else hears it. | you, with the repo | 3 to 5 hours | Vapi usage, cents a minute; n8n Cloud from about $24 a month or self-host free |
| 8 | Put the demo number into `site/index.html`, `sales/one-pager.html`, `deck/` and `brand.json`. | you | 10 min | $0 |
| 9 | Publish the website: GitHub Pages from a public `site` repo, or Netlify Drop (drag the `site` folder). Point the domain at it. | you | 30 min | $0 |
| 10 | Form endpoint for the website (Formspree, Basin or Web3Forms free tier), URL into `BRAND.formEndpoint` in `site/index.html`. | you | 10 min | $0 |
| 11 | One-pager to PDF: open `sales/one-pager.html` in Chrome, print, save as PDF, attach to email 2. | you | 5 min | $0 |
| 12 | Google Business Profile for the company, with the website and phone. | you | 20 min | $0 |
| 13 | LinkedIn: your profile headline says what you do and for whom; a company page with the logo, tagline and website. | you | 30 min | $0 |

## Before the first paid client

| # | Item | Who | Time | Cost |
|---|------|-----|------|------|
| 14 | Register the business: single-member LLC in your state (or sole proprietorship with a DBA to start). | you | 1 hour online, days to approve | $50 to $500 depending on state |
| 15 | EIN from the IRS (free, 10 minutes online) and a business bank account. | you | 1 hour | $0 |
| 16 | Get paid: Stripe account, a Payment Link per plan (Starter, Growth, Pro) with monthly billing. Put the links in email 4. | you | 30 min | 2.9% + 30¢ per charge |
| 17 | Agreement: `sales/service-agreement-template.md` read by a lawyer in your state, then into a PDF e-sign tool (Dropbox Sign, PandaDoc free tier). | you + lawyer | 1 hour + lawyer | $0 to $300 |
| 18 | General liability or tech E&O insurance quote (Hiscox, Next, Thimble). Optional at the start, expected by larger clients. | you | 30 min | from about $30 a month |
| 19 | Client onboarding form: the questions in Schedule A of the agreement as a Google Form. | you | 20 min | $0 |
| 20 | 10DLC registration for the client's number before any SMS follow-ups go out to callers. | you, per client | 30 min, then 10 to 15 days review | about $4 brand fee plus campaign fees |

## Done for you in this repository

- Website: `site/index.html` (edit the `BRAND` block at the bottom once).
- One-pager: `sales/one-pager.html`.
- Cold-call script, objections and day plan: `sales/cold-call-script.md`.
- Call tracker and lead list: `sales/call-tracker.csv`, `sales/lead-list-template.csv`.
- Follow-up emails and texts: `sales/follow-up-emails.md`.
- Agreement draft: `sales/service-agreement-template.md`.
- Pitch deck source: `deck/`.
- The receptionist itself: `README.md`.

## Rules for the calls themselves

- Dial by hand, as a person. No autodialers, no recorded messages, no AI placing the calls. Calls to a business's published line are the low-risk kind; keep them that way.
- Honour "take us off your list" immediately and keep the `dnc` column in the tracker.
- Call 8 am to 5 pm local time, Monday to Friday. Not Saturday for this first push.
- Do not text a number that has not texted you or given you the number for that purpose.
