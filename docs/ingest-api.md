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

## Never send

Do not put secrets in `message`, `metadata`, `commitMessage`, or `failureReason`.
Log payloads are rendered verbatim in the admin UI. Field-name-based redaction
protects the audit trail, not free-text log bodies.

## GitHub Actions example

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
