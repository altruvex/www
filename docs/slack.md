# Slack

One incoming webhook, outbound only. No Slack app, no bot token, no OAuth, no
per-user grant — the entire integration is one URL in the environment, which is
why it costs nothing to run and nothing to keep alive. Slack's free plan carries
unlimited incoming webhooks.

## What it is not

It is **not a second audit log.** `/audit` already records every mutation, and a
channel that receives all of them is a channel nobody reads — at which point the
one message that mattered is buried under thirty that did not.

What reaches the channel is a curated set: the events that would make somebody
put down what they are doing.

| Event | |
| --- | --- |
| `client.created` | a new lead arrived |
| `proposal.sent`, `contract.sent` | something went out to a client |
| `contract.signed` | the moment the work becomes real |
| `project.created` | delivery starts |
| `payment.status_changed` | money moved, or did not |
| `subscription.created`, `subscription.cancelled` | a retainer began or ended |
| `incident.opened` | something is down |
| `build.failed`, `deployment.failed`, `deployment.rolled_back` | a release went wrong |
| any `*.deleted` | a record was destroyed |

Deliberately **absent**: `build.succeeded`, `deployment.succeeded`,
`submission.viewed`, `task.updated`, `client.updated`, `product.token_rotated`,
`settings.*`, `meeting.status_changed`. A successful deploy on every push would
train everyone to ignore the channel within a week.

Adding an event is one line in `NOTIFIED_ACTIONS` (`lib/slack.ts`). Removing one
is the same line. That list is the whole policy.

## Where it hooks in

`recordActivity` in `lib/activity-log.ts` — the function that already runs at
every mutation site. Hanging Slack off the audit trail rather than off forty
call sites means a new mutation cannot be added and forget to notify.

Two consequences worth knowing:

- **A notification cannot break the mutation it describes.** `notifySlack`
  swallows its own failure, exactly as the audit write does, and the post is
  capped at four seconds so a Slack outage costs four seconds and not a hung
  request.
- **It is skipped inside a transaction.** An HTTP call there would hold a
  business transaction open for as long as Slack takes to answer. No caller
  currently passes a transaction client; one that genuinely needs a channel
  message should post it after the transaction commits.

## The action centre digest

`/` (the dashboard) has a **Post to Slack** button on the Action Centre panel.
It posts the current list — up to ten items, each linking back, plus a count of
what was left out.

On demand rather than on a timer, because there is no scheduler in this
application and a digest fired from a page view would arrive only when somebody
is already looking at the list it summarises.

## Setup

1. Slack → **Apps → Incoming Webhooks → Add to Slack** (or
   api.slack.com/apps → your app → Incoming Webhooks). Pick the channel; Slack
   returns a URL of the form `https://hooks.slack.com/services/T…/B…/…`.
2. Set it, in `apps/admin/.env.local` and in the Vercel project:

   ```
   SLACK_WEBHOOK_URL=https://hooks.slack.com/services/…
   NEXT_PUBLIC_APP_URL=…      # already set; it is what makes messages clickable
   ```

   The webhook URL **is** the credential — anybody holding it can post to that
   channel. Use a different one per environment so a development leak is not a
   production one, and never commit it.

3. `/integrations` → the Slack card → **Send a test**.

Without `NEXT_PUBLIC_APP_URL` messages still send; they just carry no links.

## Why the health check says "Unknown"

An incoming webhook is write-only. It answers nothing until something is posted
to it, and there is no read endpoint to probe — so reporting "healthy" because a
URL is present would be exactly the flag reporting on itself that `/health`
exists to avoid.

The **Send a test** button is the real check, and a person has to press it. It
reports Slack's own answer (`invalid_payload`, `no_service`) rather than a green
toast, because a button that claims success over a rejected payload makes a
broken integration look healthy.

## Verifying it works

```bash
cd apps/admin && bun run verify:slack
```

Covers what fails silently: which events are curated in and out, that a client
called `Smith & Sons <Holdings>` renders as a name rather than broken markup in
both the blocks and the phone-notification fallback, that an unknown entity
yields no link rather than a broken one, and that the digest truncates at ten
with an honest count of the rest.
