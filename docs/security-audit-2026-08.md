# Dependency security audit — 2026-08-27

Branch: `security/audit-triage-2026-08`. Analysis only; no dependency changes
applied, no install run.

## Scope note

This audit was requested as a re-check of "the 9 findings in `docs/follow-ups.md`
entry 2". That file does not exist — it is not on disk, not in git history
(`git log --all -- '*follow-ups*'` is empty), and no markdown in the repo mentions
`bun audit` or `dompurify`. There is therefore no recorded baseline to diff
against, and the "9" figure could not be reproduced or confirmed. What follows is
a fresh audit taken as the new baseline.

## Current picture

`bun audit` (bun 1.3.12) reports **56 advisories across 15 distinct packages**:
2 critical, 37 high, 16 moderate, 1 low. Note that bun counts *advisories*, not
packages — a single package can carry many.

## Reachability

The only findings that reach a browser at runtime are **jspdf** and its bundled
**dompurify**.

- `apps/www/lib/utils/transparency-utils.ts:831` dynamically imports `jspdf` and
  `html2canvas` inside `generateEstimatePdf()`, which calls
  `document.createElement("iframe")` — browser-only.
- That module is imported by `apps/www/components/sections/transparency-estimator.tsx:30`,
  which is marked `"use client"`.

`next` and `sharp` are server-runtime. Everything else is build-time or dev-only.

### Correction to the original premise

`posthog-js` is not a dependency of this repo — zero hits across every
`package.json` and every `.ts`/`.tsx` file. dompurify arrives via
`apps/www` → `jspdf` → `dompurify`. The conclusion that dompurify is
browser-reachable is correct; the stated path was not.

## Findings

| # | Package | Resolved | Worst | Direct? | Path | Reaches browser |
|---|---|---|---|---|---|---|
| 1 | jspdf | 3.0.4 | critical | direct (`www`) | `www › jspdf` | **yes** |
| 2 | dompurify | 3.4.10 | moderate | transitive | `www › jspdf › dompurify` | **yes** |
| 3 | next | 16.2.10 | high | direct (both apps) | `www`, `admin` | server runtime |
| 4 | sharp | 0.34.5 | high | transitive | `admin › next › sharp` | server runtime |
| 5 | image-size | 2.0.2 | high | transitive | `admin › pptxgenjs` | build-time |
| 6 | postcss | 8.5.15 / 8.4.31 | high | direct (dev) + via `next` | `www › postcss`, `next › postcss` | build-time |
| 7 | nanoid | 3.3.12 | high | transitive | `postcss › nanoid` | build-time |
| 8 | serialize-javascript | 6.0.2 | high | transitive | `next-pwa › workbox-build` | build-time |
| 9 | js-yaml | 3.14.2 | high | transitive | `www › gray-matter`; also dead chain below | build-time |
| 10 | brace-expansion | 1.1.15 | high | transitive | `minimatch` under eslint tooling | dev only |
| 11 | fast-uri | 3.1.2 | high | transitive | `ajv@8` under eslint 9 / next-pwa / mdx-loader | build-time |
| 12 | deepmerge-ts | 7.1.5 | high | transitive | `@repo/database › prisma` (dev) | build-time |
| 13 | lodash.template | 3.6.2 | high | transitive | dead chain below | dead code |
| 14 | shelljs | 0.6.1 | high | transitive | dead chain below | dead code |
| 15 | ajv | 4.11.8 | moderate | transitive | dead chain below | dead code |

### Two misleading audit labels

**`nanoid` via `docx`.** bun lists `workspace:admin › docx`, but `docx@9.7.1`
depends on `nanoid@^5.1.3`, which resolves to `5.1.16` — outside the affected
`<3.3.16` range. The only vulnerable instance is `nanoid@3.3.12` pulled by
`postcss`. Bumping or removing `docx` would not fix this.

**`ajv`, `js-yaml`, `shelljs` "via `admin › eslint`".** This reads as admin's
`eslint@9` devDependency. It is not. See below.

## The dead package

`apps/admin/package.json` carries `"eslint-config": "^0.3.0"` in **`dependencies`**,
not `devDependencies`. This is `eslint-config@0.3.0`, an abandoned 2016 package
whose own dependencies are `eslint@^2.1.0`, `gulp-util@^3.0.7`, `app-root-path`,
and `object-assign`.

It is imported nowhere. `apps/admin/eslint.config.mjs` uses `eslint-config-next`
only. It is almost certainly a typo for `eslint-config-next`.

It drags in `eslint@2.13.1` and `gulp-util@3.0.8`, and is the **sole source** of:

- `lodash.template@3.6.2` — high, command injection (via `gulp-util`)
- `shelljs@0.6.1` — high, improper privilege management (via `eslint@2`)
- `ajv@4.11.8` — moderate, prototype pollution + ReDoS (via `eslint@2 › table@3`).
  The other resolved ajv versions, `6.15.0` and `8.20.0`, are both outside the
  affected `<6.14.0` range.

and one of the two paths to `js-yaml@3.14.2` (the other, `gray-matter`, is real
and stays).

Deleting one line removes four vulnerable packages and an entire shadow copy of
eslint 2 from the production dependency tree of the admin app.

## Proposed fixes, cheapest and safest first

### Tier 0 — deletion, no version decision, zero risk

Remove `"eslint-config": "^0.3.0"` from `apps/admin/package.json` dependencies.
Unused; clears findings 13, 14, 15 and one `js-yaml` path.

### Tier 1 — same-major root overrides

All target versions verified to exist on the registry as backports within the
current major:

```json
"overrides": {
  "dompurify": "^3.4.14",
  "nanoid": "^3.3.18",
  "postcss": "^8.5.26",
  "brace-expansion": "^1.1.18",
  "fast-uri": "^3.1.6",
  "js-yaml": "^3.15.2"
}
```

Caveat on `js-yaml`: two majors are resolved in the tree (`3.14.2` and `4.2.0`).
Only 3.x is affected. A bare `"js-yaml": "^3.15.2"` override would force every
consumer — including 4.x consumers — down to 3.x, which is a breaking API change.
This one needs a scoped override, or a `gray-matter` bump instead.

Caveat on `postcss`: `next` pins its own `postcss@8.4.31`. A root override does
reach it, but that is overriding a version the framework pinned deliberately;
worth a build check.

### Tier 2 — direct upgrade, same major

`next` `16.2.10` → `^16.2.11` in both apps. Clears 9 advisories including two
SSRF highs. Patch-level bump within 16.2.

### Needs a major bump — decide separately

- **`jspdf` 3.0.4 → 4.2.1.** This is the one that matters. Affected range is
  `<=3.0.4`, so **every 3.x release is vulnerable and there is no same-major
  fix**. It carries 2 critical and 5 high advisories, and it is the only
  browser-runtime finding besides its own dompurify. Bumping it to 4.x also
  resolves dompurify transitively. A 3→4 major on a PDF renderer will need the
  estimator PDF output visually re-checked.
- **`serialize-javascript` 6.0.2 → 7.0.5+.** Affected `>=5.0.0 <7.0.5`; the fix
  crosses a major. Transitive under `next-pwa`, build-time only.
- **`deepmerge-ts` 7.1.5 → 8.0.2.** Major. Transitive under `prisma`, dev only.
- **`sharp` 0.34.5 → 0.35.x.** 0.x minor, but effectively breaking, and it is
  pinned by `next` — prefer letting a `next` upgrade carry it.

### No patched version exists

- **`image-size`** — resolved `2.0.2`, affected `<=2.0.2`, and `2.0.2` is the
  latest published release. Two high DoS advisories (infinite loops in the ICNS
  and JXL/HEIF parsers). Reached via `admin › pptxgenjs`.

  Not currently exploitable here: `apps/admin/lib/proposal-builder.ts` uses
  pptxgenjs to generate decks from internally-supplied content, so no
  attacker-controlled ICNS/JXL/HEIF image reaches the parser. Worth a watch
  item rather than a fix, and worth re-checking if client-uploaded images are
  ever passed into deck generation.

## Suggested order

1. Delete the `eslint-config` line (Tier 0).
2. Bump `next` to `^16.2.11` (Tier 2).
3. Apply the Tier 1 overrides, with `js-yaml` scoped rather than global.
4. Schedule the `jspdf` 3→4 major as its own change with PDF output verification.
5. Leave `image-size` as a tracked watch item.
