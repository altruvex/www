# Email

Outbound transactional mail: a proposal or a contract, sent to the client, and
recorded the way a WhatsApp message is.

It matters more than it looks. Email is the only client-facing channel that
works **today** — WhatsApp templates need a verified business, a registered
number and a payment method on file, and until all three exist a proposal
cannot leave the building over WhatsApp at all.

## Two transports, and how one is chosen

Whichever credentials exist. Nothing to select.

| | Set | Sends from | Free tier |
| --- | --- | --- | --- |
| **Resend** | `RESEND_API_KEY` | `hello@altruvex.com` — your own domain | 3,000/month |
| **SMTP** | `SMTP_HOST`, `SMTP_USER`, `SMTP_PASSWORD` | the mailbox the credentials belong to | whatever the mailbox allows |

Resend wins when both are set, because sending from the studio's own domain is
strictly better than sending from a personal mailbox. Neither is required —
with neither, `/email` says so and every send fails loudly rather than
returning a message id for mail that went nowhere.

### Gmail over SMTP

Free, and needs no Google Cloud project or billing account:

```
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=altruvex@gmail.com
SMTP_PASSWORD=<16-character app password>
```

The password is an **app password**, not the account password — generate one at
myaccount.google.com/apppasswords, which requires 2-step verification on the
account first. Roughly 500 recipients a day.

The cost is the From address: the client sees `altruvex@gmail.com`. Free Gmail
cannot send as a custom domain — that needs Workspace, which is paid.

### Resend

```
RESEND_API_KEY=re_…
EMAIL_FROM=hello@altruvex.com
```

Requires verifying `altruvex.com` in Resend by adding the DNS records it gives
you. `EMAIL_FROM` must be on a verified domain or Resend refuses the send —
which is the right place for that to fail.

`SMTP_PORT` is read as a number: 465 is implicit TLS, anything else (587) starts
plaintext and upgrades with STARTTLS. Getting that backwards is the usual reason
an SMTP send hangs instead of failing, so it is derived from the port rather
than being one more thing to configure wrongly.

## Sending

**Proposals → a proposal → Send proposal**, and the same on a contract. One
screen, two things in it:

- **The channel is a choice.** WhatsApp needs a verified business, a registered
  number and a payment method; email needs none of them. Which one can deliver
  is a fact about the day, not about the document — so the screen asks rather
  than assuming. Email is preselected when the client has an address and a
  transport exists.
- **The wording is editable.** Subject and body open pre-filled from
  `lib/email-templates.ts` — the same source the route falls back to, so the two
  cannot drift. The difference between "your proposal is ready" and "as we
  discussed, I moved QA a week earlier" is the difference between a notification
  and somebody following up on a deal.

**The document link is guaranteed server-side.** An editable body is a
deletable body, and a proposal email whose link was removed while rewriting the
note above it looks entirely normal as it is sent. `ensureLink` puts it back
after whatever the operator wrote, rather than refusing the send — they wanted
to send something, and the fix is to send something complete.

WhatsApp ignores the edited text: it can only send an approved template, and
saying so on the screen is better than letting somebody write a note that
silently never leaves.

The client must have an address on `Client.email`. Without one the send is
refused with that reason — not with a generic failure.

## What is recorded, and what is not

Every attempt writes an `EmailMessage`, including the ones that fail. A row that
vanished on failure would make a client's history read as though nobody ever
tried to reach them.

**A message shown as `sent` means the transport accepted it, not that it
arrived.** `DELIVERED`, `BOUNCED` and `COMPLAINED` exist in the schema and
nothing in this application can set them: they need a provider webhook, which is
**not wired up**. The states are declared so the schema does not have to change
when one is, and no row reaches them before then. `/email` says this on the
page rather than leaving it to be discovered.

## Plain text, deliberately

No HTML template. A studio sending a proposal is not sending a newsletter:
plain text lands in the inbox rather than the promotions tab, renders
identically everywhere, cannot break, and reads as a person writing to a person
— which is what it is. An HTML template would be a second design system to keep
in step with the deck for no gain the client can see.

## Verifying it works

```bash
cd apps/admin && bun run verify:email
```

Covers transport selection, the From-address and Reply-To fallback chains,
address validation — including a newline in an address, which is how header
injection gets attempted — and that the document link survives an operator
rewriting the body around it.

Delivery itself needs a real transport and a real inbox: send a proposal by
email and read `/email`, which shows what the transport answered.
