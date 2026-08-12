# Altruvex ERP / Admin — Build Prompt

> **What this is.** A self-contained build brief for turning `apps/admin` into the
> full operating system for Altruvex: unified client pipeline, price → proposal →
> WhatsApp → contract → signed → onboarding automation, project delivery tracking,
> and a company + website observability dashboard. Written to be handed to a build
> session (Claude Code or a human engineer) as the master instructions for the
> work — it does not assume the reader has any other context.
>
> **Decided (do not re-litigate these):**
> - **WhatsApp:** Meta's official **WhatsApp Business Cloud API**, integrated
>   directly — no paid BSP middleman (Twilio/360dialog/Gupshup), no `wa.me`
>   deep-link stopgap. Build this in Phase 1, not deferred.
> - **Admin auth:** **Better Auth** (free, open-source, self-hosted), replacing
>   the current single-secret HMAC cookie. Wire it to the existing Prisma `User`
>   model (`role: ADMIN/SUPERADMIN`) so admin access becomes per-user.
> - **Bias throughout:** prefer free / self-hosted / no-recurring-SaaS-fee options
>   wherever a choice exists (see §11 for the specific tradeoffs this affects —
>   e-signature and file storage).
>
> **TL;DR (عربي):** الادمن حاليًا فيه جزء بسيط بس (leads, contacts, meetings) وقاعدة
> بيانات Prisma حقيقية. الملف ده بيحدد بالظبط اللي ناقص عشان يبقى ERP كامل: عميل
> بيتسجل من الموقع أو Manual → تسعير تلقائي من نفس منطق /transparency → توليد
> Proposal → يتبعت فعليًا عن طريق WhatsApp Business API (مش زرار wa.me بسيط) →
> بعد ما يوقّع العقد يتبعتله رسالة "اللي هيحصل دلوقتي" أوتوماتيك (ده الجزء المهم
> جدًا) → تتبع المشروع والدفعات → داشبورد للشركة والموقع كله. الـ auth بيتحول لـ
> Better Auth بدل السيستم الحالي البسيط. كل حاجة تفضيلها **free** لحد ما الحجم
> يستاهل تدفع. كل حاجة هنا مبنية على الكود الموجود فعلًا — مفيش حاجة مخترعة من الصفر.

---

## 0. What already exists — do not rebuild this

| Piece | Where | State |
|---|---|---|
| Admin app shell | `apps/admin` (Next.js 16, Tailwind, shadcn/Radix) | Real, running on port 3011, shares `apps/www`'s design tokens (`bg-brand`, `text-success`, etc. — confirmed in `lib/status-badges.ts`) |
| Database | `packages/database` (Prisma + Postgres, `@repo/database` workspace package) | Real, migrated, `DATABASE_URL` reachable |
| `User` model | schema.prisma | Has `role: USER/ADMIN/SUPERADMIN` + `passwordHash`, but current admin auth does **not** use it (see §3 — this is being fixed) |
| `ContactSubmission` | schema.prisma | General contact-form leads. Funnel `status`: `NEW→VIEWED→CONTACTED→QUALIFIED→PROPOSAL_SENT→WON→LOST→SPAM`. Has `priority`, `assignedTo`, UTM fields, notes, tags |
| `TransparencyLead` | schema.prisma | Estimator submissions from `/transparency`: phone, projectType, complexity, timeline, priceMin/Max, weeksMin/Max, `convertedAt` |
| `Meeting` | schema.prisma | Discovery/consultation/proposal/followup meetings, linked to a `ContactSubmission` |
| Admin pages | `/leads` (TransparencyLead table), `/contacts` (ContactSubmission table + detail), `/meetings` | All read via Prisma server components, `dynamic = "force-dynamic"` |
| Admin auth (being replaced) | `apps/admin/lib/admin-auth.ts` | Single-operator HMAC session cookie signed with `ADMIN_SECRET` + `ADMIN_SECRET_PEPPER`. Not per-user. **Replace with Better Auth — see §3.** |
| WhatsApp today (being replaced) | `apps/www/lib/utils/whatsapp.ts` → `getWhatsAppUrl()` | Zero-infra `wa.me/<phone>` deep link used on the public site and in `/leads`. Keep this utility for the public site's own "message us" links — it's fine there — but the ERP's proposal/contract/onboarding sends use the Cloud API instead, see §5/§6. |
| Pricing logic | `apps/www/hooks/use-transparency.ts` (`PRICING_TABLE`, `TIMELINE_TABLE`, multipliers) | **Live source of truth**, but duplicated by hand in `altruvex-estimator` and `altruvex-proposal` Claude Code skills (a real drift risk, already caught once this cycle) |
| Proposal/Contract generation | `~/.claude/skills/altruvex-proposal`, `~/.claude/skills/altruvex-contract` | Exist as **Claude Code skills** (pptxgenjs / docx builders), not wired into the app. Just rebuilt to use the site's real web-native color palette (`FAFAFA`/`121212` base + Blue/Orange/Green world accents) — port the same builder logic into the app, don't redesign it |

**The gap this brief fills:** no `Proposal`, `Contract`, `Project`, or `Payment`
model exists yet. `ContactSubmission` and `TransparencyLead` are two disconnected
tables correlated only by matching phone number — there is no single "client"
identity, and nothing downstream of a lead turning into a deal. Admin access is
single-operator only. WhatsApp is a manual-click link, not an integration.

---

## 1. The core loop this ERP has to close

```
Client discovered  →  Priced  →  Proposal generated  →  Sent (WhatsApp Cloud API)
      ↓ (site form OR /transparency OR Ali types them in manually)
Contract generated  →  Sent  →  SIGNED  →  "What to expect" message fires automatically
      ↓
Project tracked (phase, staging, payments against 50/30/20)  →  Launched
```

Requirements Ali called out explicitly — treat these as non-negotiable:

1. **A lead must be enterable two ways** — auto-captured from the site, or typed in
   manually by Ali — and both must land in the *same* pipeline, not two silos.
2. **The post-signature moment is a product surface, not an afterthought.** The
   client's first experience after signing is the whole trial-experience for
   them — it has to be automatic, considered, and on-brand. This is §6 below and
   it gets the most design attention in this doc.
3. **WhatsApp is a real integration, not a "click to open the app" link** —
   proposals and the onboarding message must be sent programmatically via the
   Cloud API, with delivery/read status flowing back into the CRM.
4. **Admin auth is per-user (Better Auth)**, not a single shared secret — this
   also unblocks assigning leads/proposals to a specific admin user, which the
   schema already half-supports (`ContactSubmission.assignedTo`).
5. **Default to free/self-hosted tooling** wherever there's a choice to make.

---

## 2. Data model additions

Everything below is additive — no existing model is removed, only extended and
linked. Field names/conventions match the existing schema (`uuid` ids, camelCase
fields, `@@map` snake_case tables, explicit indexes).

### 2.1 `Client` — the unification layer

```prisma
enum ClientSource {
  WEBSITE_CONTACT_FORM
  TRANSPARENCY_ESTIMATOR
  MANUAL
  WHATSAPP_INBOUND
  REFERRAL
}

model Client {
  id      String @id @default(uuid())
  name    String?
  phone   String
  email   String?
  company String?
  industry String?      // free text now; maps to a ColorWorld at proposal time (§5.2)

  source  ClientSource @default(MANUAL)
  addedBy String?       // admin user id, set when source = MANUAL

  contactSubmission   ContactSubmission? @relation(fields: [contactSubmissionId], references: [id])
  contactSubmissionId String? @unique

  transparencyLead   TransparencyLead? @relation(fields: [transparencyLeadId], references: [id])
  transparencyLeadId String? @unique

  proposals Proposal[]
  contracts Contract[]
  projects  Project[]
  messages  WhatsAppMessage[]

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@index([phone])
  @@map("clients")
}
```

Also add the back-relation field on the two existing models (Prisma requires
both sides declared):

```prisma
// on ContactSubmission:
client Client?

// on TransparencyLead:
client Client?
```

Backfill migration (run once, alongside the schema migration): for every
existing `ContactSubmission` and `TransparencyLead`, create a `Client` row,
linking by `phone` where both a submission and a transparency lead share the
same number (dedupe on normalized phone — strip non-digits, same normalization
`getWhatsAppUrl()` already does).

### 2.2 `Proposal`

```prisma
enum ProposalStatus { DRAFT SENT DELIVERED READ VIEWED ACCEPTED REJECTED EXPIRED }
enum ColorWorld     { BLUE ORANGE GREEN NONE }

model Proposal {
  id       String @id @default(uuid())
  client   Client @relation(fields: [clientId], references: [id])
  clientId String

  projectType   String   // "website" | "webapp" | "ecommerce" | "pwa" — matches use-transparency.ts
  complexity    String   // "basic" | "standard" | "premium"
  currency      String   @default("EGP")
  totalPrice    Int      // ONE number — proposals never carry a range (see altruvex-proposal skill rule)
  lineItems     Json     // [{ name: string, amount: number }]
  timelineWeeks Int
  paymentSplit  Json     @default("{\"first\":50,\"second\":30,\"final\":20}")

  colorWorld  ColorWorld @default(BLUE)  // picked from client.industry via the INTENT SELECTION GUIDE
  accentName  String                     // "iris" | "ocean" | "brand" | "sunset" | "ember" | "mint" | "forest" | "none"

  fileUrl String?   // generated .pptx, object storage URL
  pdfUrl  String?   // rendered preview, object storage URL

  status      ProposalStatus @default(DRAFT)
  sentAt      DateTime?
  whatsappMessageId String?  // Cloud API message id, for delivery/read status correlation (§5)
  deliveredAt DateTime?
  readAt      DateTime?
  respondedAt DateTime?

  validUntil DateTime   // proposal date + 30 days (altruvex-proposal Standard Terms)

  createdBy String     // admin user id
  createdAt DateTime   @default(now())
  updatedAt DateTime   @updatedAt

  contract Contract?

  @@index([clientId])
  @@index([status])
  @@map("proposals")
}
```

### 2.3 `Contract`

```prisma
enum ContractStatus   { DRAFT SENT SIGNED DECLINED EXPIRED }
enum SignatureMethod  { CLICK_TO_SIGN UPLOADED_PDF ESIGN_API }

model Contract {
  id         String   @id @default(uuid())
  proposal   Proposal @relation(fields: [proposalId], references: [id])
  proposalId String   @unique
  client     Client   @relation(fields: [clientId], references: [id])
  clientId   String

  signToken String? @unique // public /sign/[token] page lookup

  fileUrl       String?  // generated .docx (altruvex-contract skill output, ported)
  signedFileUrl String?  // signed copy, once available

  status          ContractStatus   @default(DRAFT)
  signatureMethod SignatureMethod?
  signedAt        DateTime?
  signedByName    String?
  signedIp        String?

  onboardingMessageSentAt DateTime?  // §6 — tracks the auto "what to expect" send

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  project Project?

  @@index([clientId])
  @@index([status])
  @@map("contracts")
}
```

### 2.4 `Project` + `Payment`

```prisma
enum ProjectPhase  { DISCOVERY DESIGN DEVELOPMENT QA STAGING_REVIEW LAUNCHED POST_LAUNCH_SUPPORT }
enum ProjectStatus { ACTIVE ON_HOLD COMPLETED CANCELLED }

model Project {
  id         String   @id @default(uuid())
  contract   Contract @relation(fields: [contractId], references: [id])
  contractId String   @unique
  client     Client   @relation(fields: [clientId], references: [id])
  clientId   String

  portalToken String @unique @default(uuid()) // public /portal/[token] page lookup

  name   String
  phase  ProjectPhase  @default(DISCOVERY)
  status ProjectStatus @default(ACTIVE)

  stagingUrl String?
  liveUrl    String?

  targetLaunchDate DateTime?
  actualLaunchDate DateTime?

  payments Payment[]

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@index([clientId])
  @@index([status])
  @@map("projects")
}

enum PaymentMilestone { DEPOSIT_50 MILESTONE_30 FINAL_20 OTHER }
enum PaymentStatus    { PENDING PAID OVERDUE WAIVED }

model Payment {
  id        String  @id @default(uuid())
  project   Project @relation(fields: [projectId], references: [id])
  projectId String

  milestone PaymentMilestone
  amount    Int
  status    PaymentStatus @default(PENDING)

  dueDate   DateTime?
  paidAt    DateTime?
  method    String?   // "bank transfer" | "instapay" | "cash" | ...
  reference String?

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@index([projectId])
  @@index([status])
  @@map("payments")
}
```

A `Project` is created automatically the moment `Contract.status` flips to
`SIGNED`, pre-seeded with 3 `Payment` rows (50/30/20) computed off
`Proposal.totalPrice`.

### 2.5 `WhatsAppMessage` — conversation log

Needed once messages are sent/received through a real API instead of a deep
link — this is what makes delivery/read status and inbound replies visible in
the CRM instead of living only inside WhatsApp itself.

```prisma
enum WhatsAppDirection { OUTBOUND INBOUND }
enum WhatsAppMessageStatus { QUEUED SENT DELIVERED READ FAILED }

model WhatsAppMessage {
  id       String @id @default(uuid())
  client   Client @relation(fields: [clientId], references: [id])
  clientId String

  direction WhatsAppDirection
  status    WhatsAppMessageStatus @default(QUEUED)

  waMessageId String? @unique  // Meta's message id — correlates status webhooks
  templateName String?          // set for outbound template sends
  body         String            // text content (or a caption for media sends)
  mediaUrl     String?

  relatedProposalId String?  // optional — link back to what triggered the send
  relatedContractId  String?

  sentAt      DateTime?
  deliveredAt DateTime?
  readAt      DateTime?

  createdAt DateTime @default(now())

  @@index([clientId])
  @@index([waMessageId])
  @@map("whatsapp_messages")
}
```

---

## 3. Authentication — migrate to Better Auth

Replace `apps/admin/lib/admin-auth.ts` (single shared-secret HMAC cookie)
entirely. [Better Auth](https://www.better-auth.com/) is free, open-source,
TypeScript-native, and has an official Prisma adapter — no new database engine,
no paid tier.

**Setup:**

1. `bun add better-auth` in `apps/admin` (and wherever the auth config lives if
   it's factored into a shared package — a new `packages/auth` is reasonable
   given both `apps/admin` and a future team member's access could need it, but
   don't over-engineer this for a solo operator; start with it living directly
   in `apps/admin/lib/auth.ts` and extract later only if a second app needs it).
2. Configure the Prisma adapter against the **existing** `User` model — do not
   create a parallel `user`/`session` table set from Better Auth's defaults.
   Better Auth supports mapping to a custom schema; map its expected fields
   (`email`, `passwordHash` equivalent, etc.) onto the columns already on
   `User`, and let it add its own `Session`/`Account`/`Verification` tables
   alongside (those are new, additive tables — fine).
3. Enable the **email + password** provider only for v1 — no OAuth needed for
   an internal single-team tool.
4. Session check replaces `isAdminAuthed()` in the `(dashboard)` layout and any
   API route currently checking the HMAC cookie — swap for Better Auth's
   session helper.
5. Role gate: `role !== 'ADMIN' && role !== 'SUPERADMIN'` → redirect away from
   `(dashboard)` — `USER` role stays for future client-facing accounts if that's
   ever needed, but is never allowed into `/​(dashboard)`.
6. Migrate `ADMIN_EMAIL`/`ADMIN_SECRET` env usage: keep `ADMIN_EMAIL` only as
   the seed value for creating Ali's own `User` row in a one-time setup script;
   drop `ADMIN_SECRET`/`ADMIN_SECRET_PEPPER` once the cutover is verified working
   (don't delete them from `.env`/`turbo.json` `env` list until the old code
   path is actually gone).
7. Login page (`apps/admin/app/login/page.tsx`) swaps its form submit handler to
   Better Auth's client `signIn.email()` instead of the current custom
   `/api/auth/login` route; delete `/api/auth/login` and `/api/auth/logout`
   once Better Auth's own handler is wired in (`/api/auth/[...all]/route.ts` is
   its standard catch-all).

---

## 4. Kill the pricing duplication first

Before wiring proposals to a price, fix the thing that will otherwise drift a
4th time. Extract `PRICING_TABLE`, `TIMELINE_TABLE`, and every multiplier out of
`apps/www/hooks/use-transparency.ts` into a new workspace package:

```
packages/pricing/
  index.ts          # PRICING_TABLE, TIMELINE_TABLE, multipliers, calculateEstimate()
  package.json       # "@repo/pricing"
```

- `apps/www/hooks/use-transparency.ts` imports from `@repo/pricing` instead of
  defining the tables inline.
- `apps/admin`'s new proposal-builder (§5) imports the **same** `calculateEstimate()`
  — the admin's price and the live site's estimator can never disagree, by
  construction.
- Expose a small `GET /api/pricing` route (public, read-only) on `apps/www` so the
  two Claude Code skills (`altruvex-estimator`, `altruvex-proposal`) can eventually
  fetch the live table instead of hand-copying it — closes the exact drift class
  this session found and fixed three times over. Not required for MVP; flag it
  as a fast-follow.

---

## 5. Workflow — Price → Proposal → WhatsApp (Cloud API)

**New admin surface:** `/clients/[id]/new-proposal`

### 5.1 Calculator + generation

1. Ali opens a client (from `/clients`, the new unified list — see §8), clicks
   **New Proposal**.
2. Form mirrors `/transparency`'s own steps: project type, complexity, timeline,
   brand readiness, content readiness — the *same* inputs, computed by the
   *same* `calculateEstimate()` from `@repo/pricing` (§4). Price + week range
   shown live as the form fills in.
3. Ali can hand-edit line items (the price breakdown) before generating — the
   calculator gives a starting point, not a locked number (matches the
   `altruvex-proposal` skill's own rule: "one number, not a range," but that
   number is Ali's call, not the calculator's).
4. `industry` on the `Client` record picks the `ColorWorld` + accent
   automatically from the INTENT SELECTION GUIDE (`00-altruvex-taste.md`) —
   shown to Ali with an override dropdown, not silently applied.
5. **Generate** button: server action ports the `altruvex-proposal` skill's
   pptxgenjs build script into `apps/admin/lib/proposal-builder.ts` (same
   7-slide structure, same web-native palette, parametrized by the `Proposal`
   row instead of skill-session args). Output uploads to object storage (§10),
   `fileUrl`/`pdfUrl` saved on the `Proposal` row, status → `DRAFT`.

### 5.2 Sending — WhatsApp Business Cloud API

Meta's Cloud API, direct (developers.facebook.com/docs/whatsapp/cloud-api) — no
BSP in between, no per-message markup on top of Meta's own rates, and the
sandbox/test phone number tier is free for development.

**One-time setup (do this before writing any send code):**
1. Meta developer app → add the WhatsApp product.
2. Get a permanent access token (System User token, not the 24h temporary one)
   and a `WHATSAPP_PHONE_NUMBER_ID`.
3. Register/verify a real WhatsApp Business phone number for production sends
   (the free test number can only message a short allow-list of numbers — fine
   for building, not for real clients).
4. Set up a webhook endpoint and a `WHATSAPP_WEBHOOK_VERIFY_TOKEN` for Meta's
   verification handshake.
5. **Template requirement, non-negotiable:** WhatsApp only allows
   business-initiated messages (i.e. Ali sending a proposal first, before the
   client has messaged in the last 24h) via **pre-approved message templates**.
   Submit templates for Meta review before this feature can send anything in
   production:
   - `proposal_ready` (utility category) — "Hi {{1}}, your Altruvex proposal is
     ready: {{2}}" with a document/link parameter.
   - `contract_ready` (utility) — similar, for the contract send.
   - `onboarding_welcome` (utility) — the §6 message, templated with the
     variables it needs (kickoff timing, portal link).
   Free-form text replies are fine once the *client* has messaged first (opens
   a 24h free-form window) — only the *first* outbound message needs a
   template.

**Env vars to add:**
```
WHATSAPP_ACCESS_TOKEN=
WHATSAPP_PHONE_NUMBER_ID=
WHATSAPP_BUSINESS_ACCOUNT_ID=
WHATSAPP_WEBHOOK_VERIFY_TOKEN=
```

**Code shape:**
- `apps/admin/lib/whatsapp-api.ts` — `sendTemplateMessage(phone, templateName, params)`
  and `sendTextMessage(phone, body)` (only usable inside the 24h window), both
  writing a `WhatsAppMessage` row (`status: QUEUED` → updated on webhook
  confirmation) and returning Meta's `waMessageId`.
- `apps/admin/app/api/whatsapp/webhook/route.ts` — `GET` handles Meta's
  verification challenge; `POST` handles delivery/read status callbacks
  (update `WhatsAppMessage.status`/`deliveredAt`/`readAt`, and mirror onto
  `Proposal.deliveredAt`/`readAt` via `relatedProposalId`) and inbound message
  events (create a new `WhatsAppMessage` row with `direction: INBOUND`, surface
  it somewhere in `/clients/[id]` so Ali sees replies without leaving the CRM).
- **Send Proposal** button on `/clients/[id]` calls `sendTemplateMessage(...,
  "proposal_ready", [client.name, proposal.pdfUrl])`, stamps
  `Proposal.status = SENT`, `sentAt = now()`, `whatsappMessageId`. No manual
  "open WhatsApp and hit send" step — this is a real API call from a button
  click, full stop.

---

## 6. Workflow — Contract → Signature → **the onboarding message** (the important one)

This is the step Ali flagged twice. Treat the message itself as a designed
artifact, not a notification.

1. From an accepted `Proposal`, **Generate Contract** ports the
   `altruvex-contract` skill's docx builder the same way §5 ported the proposal
   builder. Output stored on `Contract.fileUrl`.
2. **Send Contract** — same Cloud API pattern as §5.2, `contract_ready` template.
3. **Signing.** No e-sign vendor is wired in — default to free: a
   **click-to-sign** page at `/sign/[contractToken]` (public, unauthenticated,
   single-use token) — client reads the contract, types their full legal name,
   checks "I agree," and the page records `signedAt`, `signedByName`, and
   `signedIp`. This is the `CLICK_TO_SIGN` `SignatureMethod`. Weaker legal
   standing than a paid e-sign API, but free and ships fast — see §11 for the
   tradeoff if this ever needs to change.
4. **The trigger.** The instant `Contract.status` becomes `SIGNED` (from either
   the click-to-sign page or Ali marking it manually):
   - Create the `Project` row (phase `DISCOVERY`) and the three `Payment` rows
     (50/30/20, `dueDate` = signing date for the deposit).
   - **Fire the onboarding message automatically**, via
     `sendTemplateMessage(..., "onboarding_welcome", [...])` — this cannot be a
     manual step Ali remembers to do; it fires from the status transition
     itself, same instant, every time, no exceptions.

### The onboarding message — actual copy, on-brand

Voice per `design.md` §1: precise, confident, no hedging, the "X — not Y" idiom
where it fits. Not a generic "thanks for signing!" — it sets concrete
expectations, because that *is* the client's first experience of how Altruvex
runs a project.

```
Welcome to Altruvex, {clientFirstName}.

Your contract is signed — here's exactly what happens next:

1. Kickoff call within 2 business days. We'll confirm scope details and
   collect what we need from you (brand assets, copy, account access).
2. First payment (50%) secures your build window — work starts once it clears.
3. You'll see progress on staging as soon as there's something worth seeing —
   not a status report, an actual working build.
4. Design approval triggers payment 2 (30%). Final payment (20%) happens
   before your domain goes live.

Track everything here, live: {clientPortalUrl}

No surprises, no scope creep without a change order. That's the deal.

— Ali, Altruvex
```

- `{clientPortalUrl}` is the magic-link page from §7 — the message is useless
  without somewhere for the client to actually watch progress; don't ship the
  message without the portal, even a bare-bones one.
- Submit this as the `onboarding_welcome` utility template for Meta approval
  (§5.2) with `{clientFirstName}` and `{clientPortalUrl}` as the two template
  variables — Meta templates can't carry arbitrary free text, structure the
  approved template around exactly this content.
- `Contract.onboardingMessageSentAt` gets stamped the moment it fires, so it is
  provably a one-time, automatic send — never re-sent on a later edit.

---

## 7. The client portal (minimum viable, but real)

`/portal/[projectToken]` — public, magic-link, no login. This is what
`{clientPortalUrl}` in the onboarding message points to, and it's the ongoing
answer to "what does the client experience look like."

Shows, using the **same web-native color-world palette** as the proposal
(consistency: the client sees the same blue/orange/green accent from their
proposal all the way through delivery):

- Project phase as a progress rail (`DISCOVERY → DESIGN → DEVELOPMENT → QA →
  STAGING_REVIEW → LAUNCHED`), matching `ProjectPhase`.
- Staging link, once `stagingUrl` is set.
- Payment status per milestone (paid / due / overdue) — transparency the brand
  already sells on the public site (`design.md` — "radical transparency," "what
  you can verify right now").
- A single "message us" button — this can stay a plain `wa.me` link
  (`getWhatsAppUrl()`, already exists) since it's the *client* initiating, which
  opens the 24h free-form window regardless of the Cloud API integration.

This is intentionally small for v1 — a read-only status page, not a full client
dashboard. It exists to make the onboarding message's promise ("track everything
here, live") true on day one.

---

## 8. Workflow — unified client pipeline

Replace the current split `/leads` (TransparencyLead) / `/contacts`
(ContactSubmission) views with one `/clients` list backed by the new `Client`
model, joined to whichever source record(s) it has. Keep the existing detail
views' functionality (notes, tags, meetings) — just re-point them at `Client`.
Surface the `WhatsAppMessage` log (§2.5) inline on the client detail page —
full conversation history, not just "sent/not sent."

Funnel stages shown as a Kanban or a status column, sourced from a combination of
`ContactSubmission.status` (pre-proposal stages) and the new `Proposal`/`Contract`
status (post-proposal stages) — i.e. the funnel becomes:

```
NEW → CONTACTED → QUALIFIED → PROPOSAL_SENT → PROPOSAL_READ
    → CONTRACT_SENT → SIGNED (= WON) → LOST (any stage)
```

**Manual entry:** an "Add Client" button creates a `Client` with
`source = MANUAL`, `addedBy = <admin user id>` — no `contactSubmission` or
`transparencyLead` link, enters the same pipeline as any auto-captured lead from
that point on. This satisfies the "I register them manually" requirement without
a second, parallel data model.

---

## 9. Company + website observability dashboard

New `/` (admin home) becomes a real dashboard, not a landing page:

**Pipeline / revenue:**
- Open proposals: count + total value
- Signed this month: count + total value (actual booked revenue)
- Payments due in the next 14 days, payments overdue (red)
- Funnel conversion rates stage-to-stage (from §8's stage list)
- Proposal delivery/read rates (now real data, thanks to §5.2's webhook)

**Site:**
- `/transparency` completions vs. abandons (already partially inferable from
  `TransparencyLead.convertedAt` — `NULL` = didn't convert to contact)
- Contact form submissions by UTM source (`ContactSubmission.utmSource` already
  captured, just not surfaced)
- If/when connected: pageviews and top pages from whatever analytics is on
  `apps/www` today (check for an existing Vercel Analytics / Plausible
  integration before adding a new one)

**Projects:**
- Active projects by phase (Kanban using `ProjectPhase`)
- Projects with no staging URL past their target design-approval date (a simple
  "at risk" flag, not a full PM tool)

Keep this to read-only aggregation queries over the models above — no new data
collection needed beyond what §2 already introduces.

---

## 10. File storage

Generated `.pptx` / `.docx` / `.pdf` files need object storage — Postgres is not
the place for binaries. Bias toward free: **Cloudflare R2** has a genuinely free
tier (10GB storage, and critically **zero egress fees** — the thing that
actually costs money on most providers once clients start downloading
proposals/contracts repeatedly) and an S3-compatible API, so it's a drop-in
target for any S3 client library. Vercel Blob is the alternative if the app is
Vercel-hosted and staying inside one platform's billing is preferred, but its
free tier is smaller and egress isn't free. Either way, wrap it behind a single
thin `apps/admin/lib/storage.ts` (`upload(buffer, path) → url`) so the choice
is a one-file decision.

---

## 11. Open decisions still worth a look (not blocking)

1. **E-signature.** `CLICK_TO_SIGN` (§6) is the default because it's free.
   Revisit only if a client's legal team specifically pushes back on it, or
   contract volume grows enough that a nicer signing UI pays for itself —
   SignWell/Dropbox Sign are the usual free-tier-then-paid options if so.
2. **File storage provider** — R2 vs. Vercel Blob, confirm actual hosting
   platform first (§10).
3. **WhatsApp template approval lead time.** Meta's template review can take
   anywhere from minutes to a couple of days — don't block the rest of the
   build on it; build and test with `sendTextMessage` inside a manually-opened
   24h window (message the test number from your own phone first) while
   templates are in review, then swap to `sendTemplateMessage` once approved.

---

## 12. Build order

Dependencies matter here — later pieces genuinely need earlier ones, this
isn't an arbitrary checklist:

1. **Schema migration** (§2) — `Client`, `Proposal`, `Contract`, `Project`,
   `Payment`, `WhatsAppMessage` + backfill script.
2. **Better Auth cutover** (§3) — do this early; every subsequent admin page is
   easier to build against real per-user sessions than against the old cookie.
3. **`@repo/pricing` extraction** (§4).
4. **Unified `/clients` pipeline** (§8) — the page everything else hangs off of.
5. **WhatsApp Cloud API plumbing** (§5.2 setup + `whatsapp-api.ts` + webhook) —
   build this before the proposal/contract senders need it; submit templates
   for review immediately, they're the long pole.
6. **Proposal calculator + generator + send** (§5.1/§5.2 usage).
7. **Contract generator + click-to-sign + the onboarding trigger** (§6) — the
   single most important workflow in this whole doc; don't rush it.
8. **Client portal** (§7).
9. **Company + site dashboard** (§9).

Ship end-to-end (steps 1–8) before polishing the dashboard — a working
lead-to-signed-client loop with a considered onboarding moment is the entire
point of this build.
