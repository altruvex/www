# CI ingest API

The engineering side of Altruvex OS (`/products`, `/deployments`, `/logs`,
`/incidents`) reads rows that a pipeline wrote. The admin app cannot create a
build, a deployment or a log line — only these endpoints can.

That split is deliberate. A deployment record a human typed is a claim; one that
arrived from the pipeline that performed the deployment is evidence. It is the
reason the deployment history can be trusted as a record of what actually
shipped, and the reason those screens sit empty rather than pre-filled until a
pipeline is connected.

## Authentication

Each product carries its own bearer token, issued on the product's page in the
admin app (**Products → a product → CI ingest → Issue ingest token**).

```
Authorization: Bearer avx_ingest_<random>
```

- The plaintext token is shown **once**, at issue time. Only its SHA-256 and last
  four characters are stored, so it cannot be recovered — losing it costs a
  rotation.
- A token is scoped to exactly one product. It can write that product's
  telemetry and nothing else; it grants no read access to clients, prices, or
  any other product.
- Rotating invalidates the previous token immediately. Update the pipeline
  first.
- `401` is returned identically for a missing, malformed, or unknown token, so a
  caller cannot probe which products exist.

Store it as a secret in your CI provider (`ALTRUVEX_INGEST_TOKEN`), never in the
repository.

## `POST /api/ingest/builds`

Records a build. Post it repeatedly as the build progresses — passing the same
`externalId` updates one row rather than creating three.

```jsonc
{
  "externalId": "run-8412",        // your CI's run id — the idempotency key
  "status": "RUNNING",             // QUEUED | RUNNING | SUCCEEDED | FAILED | CANCELLED
  "environment": "PRODUCTION",     // PRODUCTION | STAGING | PREVIEW (default PRODUCTION)
  "branch": "main",
  "commitSha": "9f2c1ab…",
  "commitMessage": "Fix the checkout currency field",
  "triggeredBy": "github-actions",
  "startedAt": "2026-09-07T12:00:00Z",
  "finishedAt": "2026-09-07T12:03:20Z",
  "durationMs": 200000,
  "failureReason": "Type error in src/checkout.ts"  // only meaningful on FAILED
}
```

Notes:

- Omit `externalId` and every post creates a new build. That is the correct
  reading of "the caller gave us nothing to match on".
- A field omitted from a later post is **preserved**, not cleared — a progress
  update should not erase what an earlier post established.
- `finishedAt` and `durationMs` are filled in automatically on a terminal status
  if you do not send them.
- `failureReason` is cleared automatically when a build is retried into success.
- Only terminal statuses write an activity event, so a build polling `RUNNING`
  every ten seconds does not flood the audit feed.

Returns `{ "success": true, "build": { "id", "number", "status" } }`. `number` is
per-product and monotonic — it is what an operator says out loud ("build 41
failed").

## `POST /api/ingest/deployments`

```jsonc
{
  "externalId": "dpl_91",
  "status": "SUCCEEDED",           // PENDING | IN_PROGRESS | SUCCEEDED | FAILED | ROLLED_BACK
  "environment": "PRODUCTION",
  "version": "1.4.0",
  "commitSha": "9f2c1ab…",
  "url": "https://client-site.com",
  "triggeredBy": "github-actions",
  "buildExternalId": "run-8412",   // links this deployment to that build
  "rollbackOfNumber": 90,          // the deployment number this one replaces
  "failureReason": null
}
```

Side effects worth knowing about:

- A **successful production** deployment moves the product to `LIVE` and updates
  its recorded production URL. A live product should not read as `PLANNED`.
- A successful **staging** deployment updates the staging URL and leaves the
  production URL alone.
- `rollbackOfNumber` marks the named deployment `ROLLED_BACK` and points it at
  the one that replaced it, so the superseded row shows what undid it.

## `POST /api/ingest/logs`

Batched — up to **500 entries** per request. A batch over the cap is rejected
with `400` rather than silently truncated.

```jsonc
{
  "entries": [
    {
      "level": "ERROR",            // DEBUG | INFO | WARN | ERROR | FATAL
      "message": "Checkout failed: currency missing",
      "source": "web",
      "requestId": "req-7f3a",     // ties every line of one request together
      "timestamp": "2026-09-07T12:04:11Z",
      "environment": "PRODUCTION",
      "deploymentExternalId": "dpl_91",
      "buildExternalId": "run-8412",
      "metadata": { "orderId": "A-1024" }
    }
  ]
}
```

Send `timestamp` — it is when the event happened at the source. Without it the
arrival time is used, which reorders an incident's timeline whenever ingest lags.

`requestId` is the single most useful field on this endpoint: the log explorer
pulls a whole trace from any one line that carries it.

Logs write no activity event. They are already the record, and one audit line per
log line would make the audit feed useless.

## `POST /api/ingest/github` — the GitHub webhook

The same evidence, arriving on its own instead of being posted by a step
somebody remembered to add to a workflow file. A build recorded this way is
indistinguishable from one a pipeline posted, because it describes the same run
and is written by the same code (`lib/ingest-writers.ts`).

### Authentication

GitHub's own HMAC over the raw request body, not an ingest token — a webhook can
hold neither a session nor a per-product credential.

- Set `GITHUB_WEBHOOK_SECRET` on the server, and the same value as the webhook's
  secret in GitHub.
- **It fails closed.** With no secret configured the endpoint returns `503` and
  writes nothing. An unverified webhook would be an unauthenticated write to the
  one part of this application whose value is that a human could not have typed
  it.

### Attaching a repository to a product

Two ways, on purpose — **Products → a product → GitHub → Link a repository**, and the same
control on the create form:

- **Pick one from a list.** Set `GITHUB_TOKEN` to list everything that token can
  reach (private repositories included), or `GITHUB_ACCOUNT` to list one
  account's public repositories with no credential at all. Picking also fills in
  any product field still blank — the name, the slug, and the production URL
  from the repository's own homepage.
- **Type the URL.** Any repository, including one this instance cannot see: an
  open-source project, or a client's own account.

Neither environment variable is required. Without both, the field is simply a
text input, which is what it always was.

Picking also fills in the **framework**, read from the repository's own
manifest rather than from GitHub's `language` field — "TypeScript" is equally
true of a Next.js site, an Express API and a CLI, and is not an answer to what
something is built with. Three rules govern it, and each one was a wrong answer
before it was a rule:

- **Every manifest present is read, not the first one.** `laravel/laravel`
  carries a `composer.json` that says Laravel and a `package.json` that carries
  Vite for its assets; stopping at the first answered "Vite".
- **A build tool never beats a framework.** Vite and a bare `go.mod` are
  low-confidence and used only when nothing else answers.
- **A workspace root is not the project.** A monorepo's root manifest lists
  `turbo` and no framework, so when one declares `workspaces` the applications
  underneath it are read instead.

The field says which file answered (`Read from apps/admin/package.json`), so a
wrong value can be traced rather than merely doubted. When nothing recognisable
is found the field stays blank — a guess that reads like a fact is worse than
an empty box.

The listing marks a repository already attached to another product. That is not
a nicety: the receiver **refuses** an event a second product claims, so seeing it
here is the difference between a rejected webhook and a mystery.

### Which product an event belongs to

The repository the event names, matched against the product's **repository URL**
(Products → a product → GitHub). Every spelling of the same repository matches —
`https://github.com/owner/repo`, the `.git` suffix, an `git@github.com:` remote.

- No product names that repository → `404`, and the message says so.
- **Two products name it** → `409`. A monorepo that builds several products has
  no per-repository answer to "which product did this run build", and guessing
  would file one product's history on another's page. Use the per-product ingest
  tokens there, where the pipeline states which product it means.

### Setup

Repository → **Settings → Webhooks → Add webhook**:

| Field | Value |
| --- | --- |
| Payload URL | `https://admin.altruvex.com/api/ingest/github` |
| Content type | `application/json` |
| Secret | the same string as `GITHUB_WEBHOOK_SECRET` |
| Events | **Workflow runs** and **Deployment statuses** |

Subscribing to more events than that is harmless — anything else is acknowledged
with `200` and dropped, so GitHub's delivery log stays green.

Do **not** also `curl` `/api/ingest/*` from the same workflow. Both paths are
valid; using both records every run twice.

### `workflow_run` → a build

| GitHub | Becomes |
| --- | --- |
| `status: queued / requested / waiting` | `QUEUED` |
| `status: in_progress` | `RUNNING` |
| `conclusion: success` | `SUCCEEDED` |
| `conclusion: cancelled / skipped / stale / neutral` | `CANCELLED` |
| any other conclusion (`failure`, `timed_out`, `startup_failure`) | `FAILED` |

- `externalId` is `gh-run-<run id>`, so a **re-run updates the same build** —
  including clearing the failure reason when it is retried into success.
- A workflow run carries **no environment**. One is inferred: the repository's
  default branch is `PRODUCTION`, every other branch is `PREVIEW`. This is a
  stated convention, not something GitHub sent — the alternative, defaulting to
  production, would file every branch experiment as a production build.
- `triggeredBy` is `<actor> · <workflow name>`, because a repository with a test
  workflow and a deploy workflow produces two builds per push and an operator
  needs to see which one went red.
- `failureReason` quotes GitHub's conclusion. GitHub reports a conclusion, never
  a cause; the cause is in the run's own logs.

### `deployment_status` → a deployment

| GitHub state | Becomes |
| --- | --- |
| `queued`, `pending` | `PENDING` |
| `in_progress` | `IN_PROGRESS` |
| `success` | `SUCCEEDED` |
| `failure`, `error` | `FAILED` |
| `inactive` | **nothing** |

- `externalId` is `gh-deployment-<deployment id>`.
- The environment name is free text on GitHub's side, so it is matched by
  substring: `prod*` → `PRODUCTION`, `stag*` / `test` / `qa` → `STAGING`,
  anything unrecognised → `PREVIEW`. Nothing is promoted to production by
  accident.
- `environment_url` becomes the deployment's URL, and therefore the product's
  live URL — but only if it is absolute. A relative value is worth less than
  what the product already had recorded.
- `inactive` is **not** a rollback. GitHub sends it when a deployment is
  superseded, which the superseding deployment's own row already records;
  writing `ROLLED_BACK` for it would put an undo on the timeline that nobody
  performed. A real rollback still comes through `/api/ingest/deployments` with
  `rollbackOfNumber`.

### Verifying it works

```bash
cd apps/admin && bun run verify:github        # the mapping, no database needed
cd apps/admin && DATABASE_URL=… bun run verify:engineering   # the route, end to end
```

## Never send

Do not put secrets in `message`, `metadata`, `commitMessage`, or `failureReason`.
Log payloads are rendered verbatim in the admin UI. Field-name-based redaction
protects the audit trail, not free-text log bodies.

## GitHub Actions example

Only needed if you are **not** using the webhook above. The webhook reports
workflow runs and deployments without a step in the workflow file; this is the
explicit alternative, and for a monorepo that builds several products it is the
only one that can say which product it means.

```yaml
- name: Report deployment
  if: always()
  env:
    TOKEN: ${{ secrets.ALTRUVEX_INGEST_TOKEN }}
  run: |
    curl -sS -X POST "https://admin.altruvex.com/api/ingest/deployments" \
      -H "Authorization: Bearer $TOKEN" \
      -H "content-type: application/json" \
      -d "$(jq -n \
        --arg id "${{ github.run_id }}" \
        --arg status "${{ job.status == 'success' && 'SUCCEEDED' || 'FAILED' }}" \
        --arg sha "${{ github.sha }}" \
        --arg by "github-actions" \
        '{externalId:$id, status:$status, environment:"PRODUCTION", commitSha:$sha, triggeredBy:$by}')"
```

## Verifying it works

`apps/admin/scripts/verify-engineering.ts` exercises all three endpoints against
a real database with real requests — token scoping, idempotent re-posts,
per-product numbering, rollback linking, and the activity events each writes:

```bash
cd apps/admin && DATABASE_URL=… bun run verify:engineering
```
