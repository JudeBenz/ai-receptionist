# Go-live checklist (30 minutes, client on the phone)

Do this only after all six test calls pass on the client's Vapi number and the client has called it themselves.

## Before the call

- [ ] Vapi number assigned to the client's assistant, inbound, fallback destination set to the hand-over number.
- [ ] Both n8n workflows active. Last execution of each succeeded.
- [ ] Summary email arrives at the client's address from a test call. Text alert too, if on the plan.
- [ ] `clients/<slug>/business.json` has go-live date, existing number, carrier, answer-after seconds.
- [ ] Client has read `ops/staff-one-pager.md`.

## Set conditional forwarding on the client's phone

The client dials these from the phone that receives business calls. "No answer" forwarding means their phone still rings first. Codes are the usual ones for US carriers; confirm with the carrier if one fails, and note that a business VoIP system is set in its web portal instead.

| Carrier | Forward when unanswered | Forward when busy | Cancel |
|---|---|---|---|
| AT&T, T-Mobile (GSM codes) | `*61*1VAPINUMBER#` then call | `*67*1VAPINUMBER#` | `##61#` and `##67#` |
| Verizon | `*71` then the Vapi number, then call (busy and no-answer together) | included | `*73` |
| Google Voice | Settings, Calls, forward unanswered calls | | |
| RingCentral, Nextiva, Comcast Business, 8x8 | Portal: call handling, ring for N seconds, then forward to the Vapi number; also after-hours rule to forward all calls | | |
| Landline (copper) | Carrier portal or `*92` then number on many lines | | `*93` |

Ring time: most carriers forward after about 20 to 25 seconds (4 to 5 rings) on no-answer. T-Mobile lets you set it: `**61*1VAPINUMBER**15#` for 15 seconds. If the client wants after-hours calls to go straight to the receptionist, set an after-hours rule in their phone system or use unconditional forwarding (`*72` on Verizon, `**21*` on GSM) at close and cancel it at open; a VoIP portal does this on a schedule.

## Test from a third phone (not the client's, not yours)

- [ ] Call the client's number. Let it ring out. The receptionist answers within the expected time.
- [ ] It greets with the client's business name, says it is an AI, says calls may be recorded.
- [ ] Caller ID: the receptionist pulled up the caller by number, or asked for the number if caller ID did not pass through. Note which.
- [ ] Book a test appointment. It appears on the shared calendar within a minute.
- [ ] Ask for a person. It transfers to the hand-over number and that phone rings.
- [ ] Hang up. The summary email arrives. The CallLog row appears.
- [ ] Delete the test appointment and mark the CallLog row "test".

## Hand over

- [ ] Tell the client: forwarding is on, here is what callers hear, here is what you receive, here is how to reach me.
- [ ] Put the go-live date and time in `clients/<slug>/notes.md`.
- [ ] Calendar reminder for yourself: daily transcript review for 7 days, weekly report every Monday, day-30 review booked with the client.

## Rollback

Forwarding off is the rollback: `##61#` and `##67#` (GSM), `*73` (Verizon), or the portal rule. The assistant and workflows can stay; nothing else needs undoing.
