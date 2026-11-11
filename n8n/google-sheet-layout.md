# Google Sheet layout

Create one Google Sheet called `Receptionist CRM` with two tabs. Row 1 of each tab is the header row, spelled exactly like this (lowercase, underscores), because the n8n nodes map columns by name.

## Tab `Clients`

| phone | name | email | address | created_at | source |
|-------|------|-------|---------|------------|--------|

`phone` is stored in E.164 form, for example `+13125550123`, because that is how Vapi reports the caller ID and how `lookup_client` searches.

## Tab `CallLog`

| started_at | caller_phone | caller_name | outcome | follow_up_needed | summary | duration_sec | ended_reason | recording_url | call_id |
|------------|--------------|-------------|---------|------------------|---------|--------------|--------------|---------------|---------|

`outcome` is one of: `appointment_booked`, `appointment_rescheduled`, `appointment_cancelled`, `question_answered`, `message_taken`, `transferred`, `no_action`.

## Calendar

Appointments live in Google Calendar, not in the sheet. Make a dedicated calendar called `Service visits` so the receptionist never sees personal events. Each booked event carries the caller's phone number in its description, which is how `lookup_appointment` finds a caller's visits with a text search.
