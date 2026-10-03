# /schedule — prototypes (2026-10-01)

Three standalone directions for the booking page, same copy and the same four fields
(name, phone, date, time).

- **A · Pick a time** — day strip, time buttons, a read-back sentence. Not picked.
- **B · One sentence** — the whole form is one sentence with four blanks. **Picked by Ali.**
- **C · The call, then the form** — three lines about the call beside a booking card. Not picked.

Built in `apps/www/app/[locale]/(main)/(marketing)/schedule/page-client.tsx`. The build
uses the site's own `DatePicker` and `Select` inside the sentence instead of the native
date/time inputs the prototype shows. The copy (`schedule.title`, `subtitle`, `sentence`,
`facts`) was written with the prototype and has not been reviewed.
