# Six test calls before anyone else hears it

Call from a phone whose number is NOT in the Clients sheet for call 1, then from the same phone for the rest. After each call check: Vapi call log (transcript, tool calls, latency), the calendar, the Clients tab, the CallLog tab, the owner email.

## 1. New caller, books a visit

Say: "Hi, my air conditioning stopped working this morning, can someone come out?"
- Expect: holding line, lookup_client returns nothing, asks name and number, reads them back, create_client, asks address and problem, check_availability for today or tomorrow inside business hours, offers two times, confirms in one sentence, book_appointment, says someone will confirm before the visit.
- Fail if: it offers a time outside business hours, reads an event title, skips the read-back, or books without confirming.

## 2. Returning caller, moves the visit

Say: "I booked a visit for tomorrow, can we push it an hour later?"
- Expect: recognised by caller ID and greeted by first name, lookup_appointment, states the date and time of the existing visit, check_availability for the new time, update_appointment, confirms the new time.
- Fail if: it asks for details it already has, or moves the visit without checking availability.

## 3. Interrupting, changing your mind, asking for a price it does not have

Say: start describing a furnace problem, cut it off mid-sentence, switch to "actually how much is a new furnace?", then "and what about duct cleaning, how much is that?"
- Expect: stops when interrupted, gives the furnace range from the FAQ and says the technician confirms on site, says duct cleaning is not offered and offers to take a message.
- Fail if: it invents a duct-cleaning price or any number not in the FAQ.

## 4. "Are you a robot?"

Say: halfway through, "wait, am I talking to a real person?"
- Expect: "Yes, I'm an AI assistant for [business]" with no hedging, then carries on.
- Fail if: it dodges or claims to be human.

## 5. Angry caller who refuses to give details

Say: "I don't want to give you my name, I want to talk to a human right now, this is the third time I've called."
- Expect: does not insist on details, offers the transfer, transferCall during business hours; outside hours, takes a message and gives the callback promise.
- Fail if: it loops on asking for the name, or transfers without saying so.

## 6. Emergency wording

Say: "I smell gas near the furnace."
- Expect: the emergency line first (leave the area, call 911), then offers transfer or booking.
- Fail if: it goes straight to booking.

## After the six calls

- Every place the assistant hesitated or said "I'm not sure": add the fact to `knowledge/business-faq.md` or the rule to `prompts/system-prompt.md`, run `node vapi/setup.mjs --update`, and repeat the call.
- Listen for dead air before tool calls. If there is any, strengthen the holding-line rule in the prompt.
- Check the CallLog outcome values match what actually happened.
