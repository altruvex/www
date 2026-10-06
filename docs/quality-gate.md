# Quality gate

The automated checks every push and pull request runs, what they enforce, and what they
do not. Workflow: `.github/workflows/quality.yml`. Last calibrated 2026-10-05.

## Triggers

`push` (any branch) and `pull_request`. A newer run on the same ref cancels the older one.
The workflow has `contents: read` only and uses **no secrets**.

## Jobs

### `checks`

| Step | Command | Blocks? |
|---|---|---|
| Install | `bun install --frozen-lockfile` | yes |
| Lint (www, admin, brand) | `bun run lint` | yes |
| Type check (www, admin, brand, ui, pricing-schema) | `bun run check-types` | yes |
| Price-literal guard, parity report, billing cycles | `bun run validate` | yes |
| Unit tests + coverage threshold | `bun run test:coverage` | yes |
| Admin + palette verify scripts that need no database | `bun run verify:offline` | yes |
| www font licences + line-height | `bun run check:www` | yes |
| Unused code | `bun run --cwd apps/www knip` | **advisory** (`continue-on-error`) |

Coverage (`coverage/lcov.info`) is uploaded as the `coverage` artifact.

`verify:offline` runs, with `bun --no-env-file` so no local `.env*` can leak in:
admin `verify-security`, `-lifecycle`, `-services`, `-change-requests`, `-github-mapping`,
`-slack-messages`, `-whatsapp-signature`, `-email`, `-phone`, and `packages/ui` `verify-palette`.

### `build-and-lighthouse`

1. `bunx turbo run build --filter=www` — the production build of the marketing site.
2. `npx -y @lhci/cli@0.15.1 autorun` with `lighthouserc.json` (repo root): starts
   `next start` on port 3010 and runs Lighthouse (12.6.x) three times each on
   `/`, `/services`, `/pricing`, `/transparency`, `/work`, `/ar` (headless Chrome on the runner, Lighthouse's default mobile emulation and throttling).
3. Reports (HTML + JSON per run, plus `assertion-results.json`) are written to
   `.lighthouseci/reports` and uploaded as the `lighthouse` artifact, also when the step fails.

## Lighthouse thresholds

**Blocking (`error`):**
- Accessibility category ≥ 0.95 (median run).
- SEO category ≥ 0.90 (median run).
- Each of these audits must pass on every run: `color-contrast`, `image-alt`, `label`,
  `button-name`, `link-name`, `html-has-lang`, `html-lang-valid`, `document-title`,
  `aria-allowed-attr`, `aria-required-attr`, `aria-valid-attr`, `aria-valid-attr-value`,
  `aria-hidden-focus`, `duplicate-id-aria`, `meta-viewport`.

**Advisory (`warn`, reported, never fails the job):**
- Performance category ≥ 0.80, best-practices ≥ 0.90.
- Largest Contentful Paint ≤ 2500 ms, Cumulative Layout Shift ≤ 0.1,
  Total Blocking Time ≤ 300 ms (median run).

Lighthouse numbers are lab measurements under simulated mobile-network throttling on one
machine; they are not field data (Core Web Vitals from real visitors).

## Coverage

`bunfig.toml` sets `coverageThreshold = { lines = 0.99, functions = 0.99 }`.
Measured 2026-10-05: **100.00 % functions, 99.96 % lines** (179 tests, 6 files); the
threshold is the measurement rounded down.

**Scope — read this before quoting the number.** Bun measures only source files the
tests import. That is:
- `packages/pricing-schema/src/**` (the estimate, spans, add-ons, billing cycles,
  maintenance, overrides, every published pricing view in EN and AR, formatting);
- from `apps/www`: `lib/utils/number.ts`, `lib/utils/transparency-utils.ts`,
  `lib/process-phases.ts`, `lib/config/commercial.ts`,
  `components/sections/transparency-estimator/span.ts`.

It is **not** coverage of the www app, the admin app, React components or pages.

### What the tests check

- `packages/pricing-schema/test/*.test.ts` — estimate ordering, rounding and bounds over
  every input combination; spans; add-on pricing (`computeAddonPrice` returns `null` when
  the cost is unknown, never 0); VAT/FX; billing cycles (month-end, leap year, year
  boundary); maintenance annual pricing; admin overrides; every view renders in both
  locales with no unfilled `{token}` and no Arabic-Indic digits.
- `tests/www/messages-parity.test.ts` — the `NAMESPACES` list in `i18n/request.ts` matches
  the files in `messages/en` and `messages/ar`; per namespace, EN and AR have the same keys,
  array lengths and ICU placeholders, and no message is empty in one locale only.
- `tests/www/commercial-links.test.ts` — every commercial CTA (read from
  `lib/config/commercial.ts`) and every maintenance-plan link points at an existing page
  route (the `[...rest]` catch-all does not count), an anchor id that exists in the source,
  and a `service=` value the contact form accepts.
- `tests/www/lib.test.ts` — Latin-digit folding, phone validation, scope tokens, process
  phases, and that the estimator's opening span is the schema's own.

The www tests live at the repo root (`tests/www`), not in `apps/www`, because the www
tsconfig includes every `.ts` file and has no Bun types.

## CI environment (no secrets)

| Variable | Value | Why |
|---|---|---|
| `DATABASE_URL` | `postgresql://ci:ci@127.0.0.1:5432/ci?sslmode=verify-full` | placeholder; nothing listens there |
| `CI` | `true` | |
| `NEXT_TELEMETRY_DISABLED`, `TURBO_TELEMETRY_DISABLED` | `1` | |

`prisma.config.ts` (run by `postinstall`) and the www env schema refuse to start without a
`DATABASE_URL`; `verify-full` satisfies the production TLS assertion in `@repo/database`.
At build time the pricing read fails to connect and `getPublicPricing` falls back to the
defaults shipped in `@repo/pricing-schema`, so the CI build shows schema prices, not any
admin override. Verified 2026-10-05 on a clean `git archive HEAD` extract with no `.env` file.

## Run it locally

```bash
bun run test               # unit tests
bun run test:coverage      # + coverage threshold
bun run quality            # lint, check-types, validate, test:coverage, verify:offline, check:www
# build + Lighthouse (needs Chrome installed):
DATABASE_URL='postgresql://ci:ci@127.0.0.1:5432/ci?sslmode=verify-full' CI=true \
  bunx turbo run build --filter=www && bun run quality:lighthouse
```

A local build reads `apps/www/.env.local`; to reproduce CI exactly, build from a clean
checkout with no `.env*` files.

## What is NOT enforced

- `apps/www` `check:bidi` (needs uv + Playwright; currently reports findings).
- `knip` is advisory only.
- Database-backed scripts: `verify:engineering`, `verify:admin-api`, `verify:maintenance`,
  `verify:delete`, `verify-invoice-number`, root `verify:rendered`.
- The admin and brand app production builds (they are type-checked and linted, not built).
- The test files themselves are not type-checked.
- No end-to-end, visual-regression or cross-browser tests; Lighthouse runs Chrome only.
- Performance and Core Web Vitals never fail the gate.
- Lighthouse covers six URLs, not every page.
- **Nothing here blocks a Vercel deploy until the console steps below are done.**

## Console steps (one-time, by the repo owner)

1. **GitHub branch protection.** Repository → Settings → Rules → Rulesets → New branch
   ruleset (or Settings → Branches → Add rule). Target `main`. Enable *Require a pull request
   before merging* and *Require status checks to pass*, and add the checks
   `checks` and `build-and-lighthouse` (they appear in the picker after the workflow has
   run once). Optionally enable *Block force pushes*.
2. **Vercel Deployment Checks.** Vercel → the www project → Settings → Deployment Checks →
   Add Checks → GitHub → select `checks` and `build-and-lighthouse`. Vercel then holds
   production promotion (the domain alias) until both pass. Repeat for the admin project if
   it should wait too.

Until both are done, a failing gate is visible on the commit but does not stop a merge or a
deploy.
