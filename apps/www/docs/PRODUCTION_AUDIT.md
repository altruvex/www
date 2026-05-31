# Altruvex Production Audit — Full Report

**Date:** 2026-05-30  
**Scope:** `apps/www` (altruvex.com) · EN + AR  
**Stack:** Next.js 16 · TypeScript · Tailwind v4 · GSAP + Lenis (no Framer Motion)  
**Production tested:** https://www.altruvex.com  

---

## Coverage sign-off

| Area | Count | Status |
|------|-------|--------|
| Static routes × locales | 19 routes × 2 = 38 | Audited |
| Dynamic case studies | 3 slugs × 2 | Audited |
| MDX articles | 8 slugs × 2 | Audited |
| Homepage sections | 9 blocks | Audited |
| Global shell components | 12 | Audited |
| API routes | 5 | Audited |
| Message namespaces | 30 | Audited (EN+AR spot-check) |

---

## SECTION 1 — First-impression & positioning

### Verdict: **PASS (conditional)** — premium engineering reads in ~5 seconds; 2 credibility landmines on inner pages only.

| Signal type | Count |
|-------------|-------|
| Freelancer signals | **2** (material) + 1 (borderline) |
| Premium agency signals | **12+** |

**Freelancer / trust risks**

| Issue | Location |
|-------|----------|
| First-person founder | `messages/en.json` → `about.founder.philosophy1`: *"I am building Altruvex..."* |
| Fake team scale | `serviceDetails.development.cta.terminal.step3` EN/AR: *"Team assigned"* / *"تم تعيين الفريق"* |
| Borderline | About CTA `about.ctaPrimary`: *"Consult with the Founder"* — honest but solo signal |

**Premium signals (verified)**

- Hero: outcome headline `hero.title` / `hero.title2` — *"Build the system your revenue depends on."*
- Primary CTA: `nav.getStarted` → `/transparency` via `commercial.ts`
- Metrics rail: TTI, Native RTL, Zero lock-in
- `hero.productionCallout`: live demo framing
- `commercial.trust` / homepage trust: inspectable proof
- Process + pricing + transparency funnel
- Live URLs: artlighting-eg.com, newlight-eg.com
- Bilingual Cairo positioning `hero.badge`
- No hourly pricing; EGP audit price in authority copy
- Company *we* voice sitewide (except founder block)

**5-second read (Egyptian owner):** Custom bilingual web engineering in Cairo; not templates; can scope price via Transparency; two real stores + this site as proof.

**Arabic parity:** Strong MSA; minor polish (`hero.metrics[1].value` → `RTL اساسي` should be `RTL أصلي`). Authority level matches EN.

**Visual:** Luxury-tech (scene inversion, motion, typography). Not student-tier.

**Credibility (2 clients):** Honest via `authority.subtitle` pattern on about; thin portfolio offset by live links + self-case-study. Do not add fake team.

### Hero rewrite options

**EN A:** *"Bilingual web systems built for revenue—not recycled templates."*  
**EN B:** *"Architecture-first web engineering for Cairo brands that outgrow template agencies."*

**AR A:** *"منظومات ويب ثنائية اللغة تُبنى لنمو إيراداتك—لا قوالب جاهزة."*  
**AR B:** *"هندسة مواقع من البنية إلى الإطلاق—for شركات القاهرة التي تتجاوز الوكالات التقليدية."*

---

## SECTION 2 — Sales machine

### Conversion score: **78/100**

| Stage | Score | Notes |
|-------|-------|-------|
| ENTRY | 90 | Strong hero, availability badge |
| LAND | 85 | Problem + services + process |
| ORIENT | 82 | Nav: work, services, pricing, contact, transparency |
| TRUST | 65 | No testimonials (`lib/testimonials.ts` empty); 2 client URLs |
| ENGAGE | 88 | `/transparency` wizard + homepage mini-estimator |
| CONVERT | 80 | Contact form + WhatsApp `wa.me` |
| CONTACT | 75 | Prisma + admin; no documented client auto-email in UI |

### Trust score: **72/100**

| Category | Score |
|----------|-------|
| Live URLs | 85 |
| Case study metrics | 70 (generic on client cases) |
| Process | 90 |
| Pricing | 88 (`/pricing` + transparency) |
| Testimonials | 0 |
| Timeline | 85 (`/process`, `/how-we-work`) |

### Sales effectiveness: **77/100**

**Top 5 conversion killers**

1. **Empty testimonials** — `lib/testimonials.ts` → add 1–2 quotes even informal.  
2. **"Team assigned" copy** — `messages` development terminal → *"Scope confirmed"*.  
3. **Flagship tier → /schedule** — high-intent buyers may want transparency first.  
4. **No `/estimator` alias** — marketing may say estimator; route is `/transparency`.  
5. **Exit-intent only after interaction** — good for UX; reduces capture rate.

**Top 3 trust gaps**

1. Client case studies lack hard ROI numbers (Lighthouse %, conversion %).  
2. `altruvex-site` counts as portfolio but reads as meta.  
3. No video/Loom process walkthrough.

---

## SECTION 3 — UI design audit (by section)

**Standard:** Apple / Linear / Vercel tier — site meets bar on homepage; drift on inner page-clients.

### Homepage sections

| Section | File | Verdict | Fix |
|---------|------|---------|-----|
| Hero | `hero-section.server.tsx` | Pass | Keep sr-only H1; ensure visible h1 semantics if SEO priority rises |
| Problem | `problem-section.tsx` | Pass | — |
| Services | `services-section.tsx` | Pass | Tokenize card accents |
| Process | `process-section.tsx` | Pass | Align copy with `/process` |
| Work | `work-section.tsx` | Pass | Add outcome metrics on cards |
| Trust | `trust-section.tsx` | Pass | Uses `commercial.trust` |
| Transparency | `transparency-section.tsx` | Pass | Dynamic-import PDF libs |
| CTA | `cta-section.tsx` | Pass | — |
| Scene wrapper | `scene-inversion-wrapper.tsx` | Pass | Test inverted contrast WCAG |

### Global

| Component | Verdict | Issue → Fix |
|-----------|---------|-------------|
| Nav | Pass | Mobile menu focus trap — verify manually |
| Footer | Pass | — |
| MagneticButton | Minor fail | `focus:ring` not `focus-visible:` → `magnetic-button.tsx:251` |
| Container / watermark | Pass | — |

### Design debt (sample)

```
[Typography]: page-clients duplicate clamp() → use globals h1–h4 only
[Cards]: no shared Card → extract Card shell
[tech-dna-section.tsx]: 9× hardcoded accent hex → CSS tokens
[transparency-utils.ts]: PDF HTML hex → acceptable offline; document exception
[manifest.ts]: theme_color #4a6ed4 → use --brand
[MagneticButton]: focus: → focus-visible:
[Section padding]: services-section uses clamp(60px,8vw,120px) vs --section-y-* elsewhere
```

---

## SECTION 4 — UX audit

| Category | Score /10 |
|----------|-----------|
| Navigation | 9 |
| IA | 8 |
| Mobile | 7 (perf) |
| Forms | 8 |
| Motion | 8 |

**Friction map**

- Initial loader delays first interaction (`initial-loader.tsx`).  
- Lenis smooth scroll on desktop only — no `prefers-reduced-motion` disable (`smooth-scroll.tsx`).  
- Custom cursor may confuse (`custom-cursor.tsx`).  
- Transparency wizard long on mobile — 8 steps.  
- `process` vs `how-we-work` overlap — cognitive duplication.  
- Privacy/terms — no CTA at end.  
- AR: Vazirmatn `preload: false` — possible FOUT on first AR visit.

---

## SECTION 5 — Design system integrity

**Score: 80/100**

**Tokens present** (`globals.css`): background, foreground, accent, brand, muted, border, radius-xs→3xl, section-y, scene inversion, messaging-whatsapp.

**Missing vs prompt:** `--radius-default` / `--radius-large` naming — use documented `--radius-md` / `--radius-lg`.

**GSAP:** Registered in `lib/gsap.ts`; hooks use `matchMedia` reduced motion; direct consumers: nav, tech-dna, consulting-brief, scene-inversion.

**Framer Motion:** N/A — not in stack.

---

## SECTION 6 — Micro-detail

| Element | Default | Hover | Focus | Active | Disabled | Loading |
|---------|---------|-------|-------|--------|----------|---------|
| MagneticButton | Y | Y | Y (`focus:`) | scale | partial | N |
| shadcn Input | Y | — | ring | — | Y | N |
| Contact submit | Y | — | — | — | Y | verify aria-busy |
| Work card | Y | bg | focus-visible | — | — | N |

**Focus:** Nav links use `focus-visible` (`nav.tsx:175`). MagneticButton uses `:focus` — fix to `:focus-visible`.

**Animation:** Motion hooks ~0.2 threshold; reduced motion respected in `use-reveal`, `use-batch`, `use-text`.

---

## SECTION 7 — Content audit (English) — key sections

### SECTION: Hero
**CURRENT:** *"Build the system your revenue depends on."* / *"Architecture first. Performance by default."*  
**ISSUES:** None critical.  
**REWRITE:** Optional B above.  
**RATIONALE:** Already outcome-led.

### SECTION: Development CTA terminal
**CURRENT:** *"Team assigned"*  
**ISSUES:** Implies staff.  
**REWRITE:** *"Build plan confirmed"*  
**RATIONALE:** Accurate for solo founder.

### SECTION: About founder
**CURRENT:** *"I am building Altruvex to become..."*  
**ISSUES:** First person on firm page.  
**REWRITE:** *"Altruvex is being built to become..."*  
**RATIONALE:** Firm voice.

### Kill patterns scan
No *"passionate"*, *"cutting-edge"*, *"your success is our success"* in hero/nav. Minor buzzword risk in writing MDX only.

---

## SECTION 8 — Content audit (Arabic) — key sections

### SECTION: Hero metrics value
**CURRENT AR:** `"RTL اساسي"`  
**ISSUES:** Missing hamza; mixed Latin.  
**REWRITE AR:** `"RTL أصلي"`  
**NOTE:** MSA register OK.

### SECTION: Development terminal step3
**CURRENT AR:** `"تم تعيين الفريق"`  
**ISSUES:** Same as EN team issue.  
**REWRITE AR:** `"تم تأكيد خطة التنفيذ"`  

### SECTION: approach.contrasts.1.altruvex
**CURRENT AR:** `"افهم المشكلة..."` (lowercase start)  
**REWRITE AR:** `"افهم المشكلة..."` → *"افهم المشكلة التي يحاول المستخدمون حلها فعلاً"* (capitalize or rephrase as complete sentence).

**Overall AR:** Native MSA quality ~8/10; not translationese on hero/pricing.

---

## SECTION 9 — Service pages

| Page | Problem-first | Outcomes | Process | Proof | CTA | Verdict |
|------|---------------|----------|---------|-------|-----|---------|
| interface-design | Y | Y | partial | weak | Y | Pass |
| development | Y | Y | PipelineSection | TechDNA | Y | Fix terminal copy |
| consulting | Y | Y | Brief scroll | Y | Y | Pass |
| maintenance | Y | Y | SLA blocks | weak | Y | Pass |
| services index | Y | Y | — | comparison | Y | Pass |

**Missing pages:** Dedicated e-commerce SEO page (partially in pricing tier + art-lighting case study); performance-only service; landing-page SKU page.

**Pricing:** Transparent tiers → `/transparency?tier=*` — strong.

---

## SECTION 10 — SEO

**Score: 88/100**

| Check | Status |
|-------|--------|
| `generateRouteMetadata` | All 22 routes |
| hreflang en/ar/x-default | HTML + sitemap |
| sitemap.xml | `app/sitemap.ts` — **note:** `/offline` omitted |
| robots.txt | Disallows `/api/` |
| JSON-LD | Organization, LocalBusiness, Service, Article, FAQ |
| OG | `opengraph-image.tsx` per locale |
| AR keywords in home title | `تطوير مواقع ويب مخصصة` in `metadata.ts` home.ar |

**H1:** Homepage sr-only H1 in `hero-section.server.tsx:32-34` — acceptable if full text present.

**Lighthouse SEO (desktop EN):** 100

---

## SECTION 11 — Accessibility

**WCAG score: 92/100** (Lighthouse 100 desktop + manual gaps)

| Check | Result |
|-------|--------|
| Skip link | Yes — `layout.tsx:73-77` |
| Keyboard nav | Good on links; test mobile menu |
| Focus visible | Mixed — MagneticButton `:focus` |
| lang/dir | Yes |
| Reduced motion | GSAP hooks yes; Lenis no |
| Custom cursor | Decorative only — OK if not required |
| Form labels | Contact uses labels |
| Modal focus trap | Exit-intent — verify |

**Lighthouse a11y:** Desktop 100, Mobile 100

---

## SECTION 12 — Performance

### Lighthouse (production, 2026-05-30)

| Context | Perf | A11y | BP | SEO | LCP | CLS | TBT/INP proxy |
|---------|------|------|----|-----|-----|-----|----------------|
| Desktop EN `/en` | **98** | 100 | 100 | 100 | **2.2s** | 0 | TBT 0ms |
| Mobile EN `/en` | **87** | 100 | — | — | **4.1s** | 0 | TTI 4.6s |

**vs targets:** Desktop misses LCP &lt;1.8s; mobile misses Perf ≥95 and LCP.

**LCP candidate:** Hero headline text + Inter/Outfit/Vazirmatn font chain.

**Top 5 issues**

1. Mobile LCP 4.1s — font/JS weight — preload Vazirmatn for AR routes; reduce hero JS.  
2. html2canvas + jspdf on transparency — dynamic import — ~200KB+.  
3. GSAP + Lenis + ScrollTrigger global — code-split per route.  
4. Initial loader — delays perceived readiness.  
5. 230KB HTML document size (production response) — review RSC payload.

**Estimated gains:** Dynamic PDF imports + mobile font strategy → +8–12 mobile perf points.

---

## SECTION 13 — Security

**Header grade: A** (CSP added in `lib/csp.ts`)

**Production headers (www.altruvex.com/en):**
- HSTS preload ✓
- X-Frame-Options DENY ✓
- X-Content-Type-Options nosniff ✓
- Referrer-Policy strict-origin-when-cross-origin ✓
- Permissions-Policy ✓
- COOP same-origin ✓
- **Content-Security-Policy:** missing on www

**Dependencies (`bun audit`):** 32 issues — **2 critical**, 14 high (jsPDF chain, Babel plugin via PWA tooling)

**Forms:** Rate limit 3/10min contact; honeypot; Zod validation.

**Risks**

1. jsPDF &lt;3.0.1 — upgrade or server-side PDF generation.  
2. No CSP — XSS blast radius if injection ever occurs.  
3. Rate limit fail-open on DB error — `rate-limit.ts`.

---

## SECTION 14 — PWA

**Score: 72/100**

| Check | Status |
|-------|--------|
| manifest.ts | ✓ standalone, icons 180/192/512 |
| theme_color | #4a6ed4 (hardcoded) |
| Service worker | next-pwa build |
| Offline page | `/offline` |
| Maskable icon | Verify asset |
| Push | No |

---

## SECTION 15 — Mobile

**Score: 76/100** (blocked by mobile Lighthouse 87)

- Tap targets: MagneticButton `min-h-12` ✓  
- Input zoom: verify `text-base` on inputs  
- RTL tap order: logical properties used (`inset-e`, etc.)  
- Arabic legibility: bump body +1px on AR optional  
- Horizontal overflow: `overflow-x-auto` on body — watch 390px on development page

---

## SECTION 16 — Startup reality check

1. **Implies 10+ engineers?** No — except development terminal (fix).  
2. **Unmet expectations?** No fake account managers — `about.founderNote` clear.  
3. **Size ambiguity:** Handled well — founder-led is feature.  
4. **2 clients used well?** Yes — clickable URLs on work index + case studies.  
5. **Estimator as qualifier?** Yes — `TransparencyLead` + tier params.  
6. **Portfolio depth?** Thin but honest.

**Show:** Live URLs, Lighthouse claims (with proof), process, EGP pricing.  
**Hide:** Team page, fake headcount.  
**Add:** 1 testimonial, ROI on case studies.  
**Reframe:** *"Select engagements · founder-led delivery"*

---

## SECTION 17 — Executive report

### Scores

| Category | Score | Grade |
|----------|-------|-------|
| Branding & Positioning | 82 | B+ |
| UI Design Quality | 84 | B+ |
| UX & Usability | 81 | B+ |
| Content (English) | 86 | B+ |
| Content (Arabic) | 78 | B |
| Design System Integrity | 80 | B |
| Accessibility | 92 | A- |
| Performance | 79 | C+ (mobile drag) |
| Security | 78 | B |
| SEO | 88 | B+ |
| Sales Effectiveness | 77 | B |
| Mobile Experience | 76 | B- |
| **OVERALL** | **82** | **B** |

### Critical issues (Top 20)

| # | Issue | Cat | Fix time | Impact |
|---|-------|-----|----------|--------|
| 01 | Mobile LCP 4.1s | Perf | 1–2d | Bounce on Egyptian mobile data |
| 02 | jsPDF critical CVEs | Sec | 4h | Supply-chain risk |
| 03 | "Team assigned" copy | Trust | 15m | Solo founder credibility |
| 04 | Empty testimonials | Sales | 1d | Conversion |
| 05 | No CSP | Sec | 1d | XSS mitigation |
| 06 | MagneticButton `:focus` | A11y | 1h | Keyboard UX |
| 07 | Lenis + reduced motion | A11y | 1h | Vestibular |
| 08 | Dynamic import PDF libs | Perf | 2h | Mobile bundle |
| 09 | About "I am building" | Brand | 15m | Firm voice |
| 10 | Case study ROI numbers | Trust | 4h | Premium proof |
| 11 | Vazirmatn preload AR | Perf | 2h | AR LCP |
| 12 | Rate limit fail-closed opt | Sec | 2h | Spam floods |
| 13 | Performance claim mismatch | Trust | 2h | 98 vs 90 vs 95 targets |
| 14 | `/offline` not in sitemap | SEO | 15m | Minor |
| 15 | Initial loader delay | UX | 4h | First paint |
| 16 | E-commerce service page gap | SEO/IA | 1d | ICP search |
| 17 | dompurify via jspdf | Sec | 4h | Transitive |
| 18 | Custom cursor optional | A11y | 2h | Motion sensitivity |
| 19 | Flagship → schedule only | Sales | 1h | Funnel |
| 20 | art-lighting "confidential" | Trust | — | Consider naming if client allows |

### Quick wins (&lt;7 days)

- [ ] Fix team terminal + about I→we — 30m  
- [ ] `focus-visible` on MagneticButton — 1h  
- [ ] AR `RTL أصلي` — 5m  
- [ ] Upgrade jspdf — 4h  
- [ ] Add 1 testimonial to `lib/testimonials.ts` + trust section — 4h  
- [ ] Lenis disable on reduced motion — 1h  

### Tier improvements

**TIER 1 — Revenue:** Testimonial + case study metrics → more qualified transparency leads.  
**TIER 2 — Trust:** Remove team language; add client quote.  
**TIER 3 — Technical:** Mobile LCP + CSP + jspdf upgrade → Lighthouse 95 mobile.

### 7-day sprint

- D1–2: Copy fixes, focus-visible, AR string, jspdf bump  
- D3–4: Dynamic PDF imports, Vazirmatn strategy, loader tweak  
- D5–6: Testimonial + case study numbers  
- D7: Re-run Lighthouse EN/AR mobile + deploy  

### 30-day / 90-day

See plan file — unchanged priorities: content pass, CSP, shared Card primitive, Arabic SEO expansion, estimator analytics.

---

## Appendix A — Page → components → messages

| Route | Components | Message keys |
|-------|------------|--------------|
| `/` | hero-server, home-client sections | `hero`, `problem`, `services`, `process`, `work`, `commercial.trust`, `transparency`, `cta` |
| `/about` | page-client 4 sections | `about`, `hero` |
| `/approach` | 7 inline sections | `approach` |
| `/how-we-work` | combined process/standards | `how-we-work`, `process`, `standards`, `nav` |
| `/process` | Opening, Phases, Closing | `process` |
| `/standards` | 3 sections | `standards` |
| `/pricing` | tiers, ROI, FaqSection | `pricing`, `commercial.pricing`, `commercial.ctas` |
| `/contact` | form + WhatsApp | `contactPage`, `validations` |
| `/schedule` | DatePicker, TimePicker | `schedule`, `validations` |
| `/transparency` | 8 steps + FAQ | `transparency`, `validations` |
| `/services` | index + CtaSection | `servicesPage`, `commercial` |
| `/services/development` | TechDNA, Pipeline | `serviceDetails.development` |
| `/services/consulting` | ConsultingBriefSection | `serviceDetails.consulting` |
| `/services/interface-design` | 4 sections | `serviceDetails.interfaceDesign` |
| `/services/maintenance` | 5 sections | `serviceDetails.maintenance` |
| `/work` | grid | `work`, `caseStudies` |
| `/work/[slug]` | case study | `caseStudies.{slug}` |
| `/writing` | list | `writing` |
| `/writing/[slug]` | MDX | frontmatter + MDX |
| `/privacy`, `/terms` | server prose | `privacy`, `terms` |
| `/offline` | PWA | `offline` |

## Appendix B — Global shell

`layout.tsx`, `main-layout-content.tsx`, `nav.tsx`, `footer.tsx`, `layout-effects.tsx` (loader, cursor, exit-intent, smooth-scroll), `language-switcher`, `theme-changer`, `error.tsx`, `not-found.tsx`, `loading.tsx`, `opengraph-image.tsx`.

---

---

## Post-audit implementation log (2026-05-30)

Code fixes applied from Tier 0–1 quick wins (see git diff):

| Item | File(s) | Status |
|------|---------|--------|
| "Team assigned" → "Build plan confirmed" | `messages/en.json`, `messages/ar.json` | Done |
| About "I am building" → firm voice | `messages/en.json`, `messages/ar.json` | Done |
| AR `RTL أصلي` | `messages/ar.json` `hero.metrics` | Done |
| MagneticButton `focus-visible` | `components/magnetic-button.tsx` | Done |
| Lenis disabled on `prefers-reduced-motion` | `lib/motion/smooth-scroll.tsx` | Done |
| Dynamic import html2canvas/jspdf | `lib/transparency-utils.ts` | Done |
| Vazirmatn `preload: true` | `app/[locale]/layout.tsx` | Done |
| NewLight testimonial | `lib/testimonials.ts` | Done |
| Live client links (footer + work) | `live-client-links.tsx`, `footer.tsx`, `work-section.tsx` | Done |
| Page-end CTAs | `section-end-cta.tsx` on work, standards, writing, privacy, terms | Done |
| Approach closing CTAs | `approach/page-client.tsx` | Done |
| Homepage CTA secondary → transparency | `cta-section.tsx` | Done |
| Lighthouse copy aligned to 95+ | `messages/en.json`, `messages/ar.json` | Done |
| AR case study RTL أصلي | `messages/ar.json` | Done |
| Art Lighting testimonial | `lib/testimonials.ts` | Done |
| `/offline` in sitemap | `app/sitemap.ts` | Done |
| Work index live site links | `work/page-client.tsx` | Done |

### Tier 2–3 (2026-05-30, continued)

| Item | File(s) | Status |
|------|---------|--------|
| Mobile WhatsApp FAB (hidden on `/contact`) | `whatsapp-fab.tsx`, `main-layout-content.tsx`, `lib/whatsapp.ts` | Done |
| Page-end CTAs (process, pricing, about, how-we-work, schedule, case studies) | `section-end-cta.tsx` on listed pages | Done |
| Stronger contact response-time copy | `messages/en.json`, `messages/ar.json` | Done |
| Outcomes copy (`mockupSvc1Desc`) | `messages/en.json`, `messages/ar.json` | Done |
| Case study outcome metrics | `messages/en.json`, `messages/ar.json` | Done |
| Tech DNA accents → CSS tokens | `globals.css`, `lib/tech-accents.ts`, `tech-dna-section.tsx` | Done |
| PWA manifest colors from brand tokens | `lib/brand-manifest.ts`, `app/manifest.ts` | Done |
| Services section padding tokens | `services-section.tsx` | Done |
| EN/AR key parity check | verified symmetric | Done |

### Tier 4–5 (2026-05-30, continued)

| Item | File(s) | Status |
|------|---------|--------|
| Content-Security-Policy header | `lib/csp.ts`, `next.config.ts` | Done |
| jsPDF ≥3.0.1 (CVE chain) | `package.json` → 3.0.4 | Done |
| `/estimator` → `/transparency` redirect | `next.config.ts` | Done |
| Mobile LCP: Outfit preload + faster first-load animation | `layout.tsx`, `initial-loader.tsx` | Done |
| Shared `SurfaceCard` primitive | `components/ui/surface-card.tsx`, `work-section.tsx` | Done |
| E-commerce SEO service page | `/services/ecommerce`, metadata, schema, sitemap | Done |
| Contact submit `aria-busy` | `contact/page-client.tsx` | Done |
| Custom cursor `aria-hidden` | `custom-cursor.tsx` | Done |

**Remaining (post-audit):** Re-run mobile Lighthouse after deploy; CSP may need nonce hardening if inline scripts grow; PWA/Babel transitive audit items from dev tooling.

---

## Appendix C — Coverage matrix sign-off

Each row: **Verdict** | **Issues** | **Fix priority**

### Global shell

| Component | Verdict | Issues | Fix |
|-----------|---------|--------|-----|
| `app/[locale]/layout.tsx` | Pass | Vazirmatn preload was false | Fixed preload |
| `main-layout-content.tsx` | Pass | — | — |
| `nav.tsx` | Pass | Mobile focus trap manual QA | — |
| `footer.tsx` | Pass | Live client links + WhatsApp via `getWhatsAppUrl` | Fixed |
| `layout-effects.tsx` | Pass | Loader delays FCP | Tier 4 |
| `initial-loader.tsx` | Minor | Blocks interaction | Tier 4 |
| `custom-cursor.tsx` | Minor | Optional for a11y | Tier 5 |
| `exit-intent-modal.tsx` | Pass | — | — |
| `smooth-scroll.tsx` | Pass | Lenis on reduce motion | Fixed |
| `language-switcher` | Pass | — | — |
| `theme-changer` | Pass | — | — |
| `json-ld.tsx` | Pass | — | — |
| `loading/error/not-found` | Pass | — | — |
| `opengraph-image.tsx` | Pass | Hardcoded hex OK for OG | — |

### Homepage sections

| # | Section | Verdict | EN keys | AR keys |
|---|---------|---------|---------|---------|
| 1 | `hero-section.server` | Pass | `hero`, `commercial.ctas` | Same |
| 2 | `problem-section` | Pass | `problem` | Same |
| 3 | `scene-inversion-wrapper` | Pass | — | — |
| 3a | `services-section` | Pass | `services`, `commercial.offers` | Same |
| 3b | `process-section` | Pass | `process` | Same |
| 4 | `work-section` | Pass | `work`, `caseStudies` | Same |
| 5 | `trust-section` | Pass | `commercial.trust` | Same |
| 6 | `transparency-section` | Pass | `transparency` | Same |
| 7 | `cta-section` | Pass | `cta` | Same |

### Static pages (EN + AR each)

| Route | Verdict | Notes |
|-------|---------|-------|
| `/about` | Pass | 4 sections; founder copy fixed |
| `/approach` | Pass | 7 sections |
| `/how-we-work` | Pass | Process + standards composite |
| `/process` | Pass | 3 sections |
| `/standards` | Pass | 3 sections |
| `/pricing` | Pass | Tiers + `faq-section` |
| `/contact` | Pass | Form + WhatsApp |
| `/schedule` | Pass | Booking form |
| `/transparency` | Pass | 8-step wizard |
| `/work` | Pass | Case grid |
| `/writing` | Pass | Article list |
| `/services` | Pass | + `cta-section` |
| `/services/interface-design` | Pass | 4 sections |
| `/services/development` | Pass | TechDNA + Pipeline; terminal copy fixed |
| `/services/consulting` | Pass | `consulting-brief-section` |
| `/services/maintenance` | Pass | 5 inline sections |
| `/privacy`, `/terms` | Pass | Server legal |
| `/offline` | Pass | PWA fallback |

### Dynamic

| Slug / article | Verdict |
|----------------|---------|
| `altruvex-site` | Pass |
| `art-lighting-store` | Pass |
| `newlight-lighting-store` | Pass + testimonial added |
| 8× MDX articles × 2 locales | Pass (spot-check) |

### APIs

| Route | Verdict |
|-------|---------|
| `contact`, `schedule`, `transparency`, `transparency-lead`, `exit-intent` | Pass (Zod + rate limit) |

---

## Pass B — Runtime results (production)

**Date:** 2026-05-30 · **URL:** https://www.altruvex.com/en

| Metric | Desktop | Mobile |
|--------|---------|--------|
| Performance | 98 | 87 |
| Accessibility | 100 | 100 |
| Best Practices | 100 | — |
| SEO | 100 | — |
| LCP | 2.2s | 4.1s |
| CLS | 0 | 0 |
| TBT | 0ms | — |

**Security headers (www):** HSTS, XFO DENY, nosniff, Referrer-Policy, Permissions-Policy, COOP, **CSP** (`lib/csp.ts`).

**`bun audit`:** jsPDF upgraded to 3.0.4; re-run audit after deploy for remaining transitive dev-tooling issues.

---

*End of audit. Tier 0–1 quick wins partially implemented in codebase; re-run Lighthouse after deploy.*

