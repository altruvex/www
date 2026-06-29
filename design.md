# Altruvex — Design System & Brand Reference

> The single source of truth for everything Altruvex *looks like*, *sounds like*, and *stands for*.
> Use this when creating social posts, ads, decks, proposals, or any asset that carries the brand.
> Every value here is pulled from the live codebase (`apps/www`) — not invented. The canonical
> source is `apps/www/app/globals.css` (colors/type) and `apps/www/messages/{en,ar}.json` (voice).

---

## 0. What Altruvex Is (the one-paragraph brief)

**Altruvex is a precision web engineering firm in Cairo.** It builds custom multilingual web
systems — applications, e-commerce, business portals, performance rescues — for businesses that
demand high-end engineering, **not recycled templates**. Every project gets direct founder
involvement (Ali Abdelhadi, Founder & Lead Engineer). The promise: architecture-first builds,
sub-1s mobile performance, native RTL, full source-code ownership, zero vendor lock-in.

- **Category:** Custom / bespoke web engineering (the opposite of agencies selling WordPress themes).
- **Market:** Egyptian & Arab web market, positioned at the premium / "reference standard" end.
- **Proof model:** *"This site itself is the proof."* The website is a live demonstration of the
  production standard delivered to clients.
- **Brand ambition:** "Build work of such quality that others can copy the surface — **but not the
  standard behind it.**"

---

## 1. Brand Voice & Positioning

The voice is **precise, confident, technical, and unhedged.** It reads like a senior engineer who
respects the reader's intelligence — never like marketing. It earns trust by being specific and by
naming the industry's failures plainly.

### Voice pillars
| Pillar | What it means | Example phrase |
|---|---|---|
| **Engineering over decoration** | We talk architecture, performance, ownership — not "beautiful websites." | *"Architecture first. Performance by default."* |
| **Radical transparency** | Published prices, named exclusions, no scope creep. | *"Transparent pricing. No hidden costs."* |
| **Anti-template** | The recurring enemy is the recycled theme. | *"They're getting templates."* |
| **Accountable & founder-direct** | One engineer accountable, no middlemen. | *"Founder-direct. No sales script. No pitch deck."* |
| **Proof you can verify** | We don't claim — we show. | *"What you can verify right now."* |

### The signature copy idiom — "X — not Y"
The brand's most recognizable rhetorical move is the **em-dash contrast**: state the standard, then
dismiss the cheap alternative.
- *"...architecture — **not templates with a brand coat.**"*
- *"...built to generate revenue — **not just to render on a screen.**"*
- *"full source code ownership — **not a Shopify subscription, not a WordPress plugin stack.**"*
- *"Native RTL — **not a mirrored LTR template.**"*

**Rule for social:** every Altruvex claim should be able to finish the sentence "…not ___." If it
can't name the lazy alternative it's rejecting, it's not on-brand yet.

### Tone do / don't
- **Do:** lead with a number or a hard claim. Use periods, not exclamation marks. Be terse.
- **Do:** name the failure mode of the industry, then position against it.
- **Don't:** use hype words ("amazing", "stunning", "world-class"), emojis-as-decoration, or filler.
- **Don't:** hedge ("we try to", "we aim to"). State it: *"If it is not accessible, it is not finished."*

### Stock signature lines (safe to reuse verbatim)
- "Build the system your revenue depends on."
- "Architecture first. Performance by default."
- "Most businesses aren't getting engineering. They're getting templates."
- "Every 100ms of latency is a conversion leak."
- "If it is not accessible, it is not finished."
- "You own the domain. They own the knowledge." (the problem we fix)
- "Founder-direct. No sales script. No pitch deck."
- "Pressure-test your scope before you commit budget."

---

## 2. Logo & Wordmark

- **Wordmark color (light mode):** near-black — `--logo-wordmark: 0 0% 6%` (`#0F0F0F`).
- **Wordmark color (dark mode):** near-white — `0 0% 94%` (`#F0F0F0`).
- **Tagline color:** muted grey — `0 0% 40%` light / `0 0% 58%` dark.
- **Logo background / brand surface:** `#FAF9FC` (warm off-white, from the manifest).
- **PWA theme color:** `#4a6ed4` (manifest). ⚠️ *Note: the manifest hex is slightly out of sync with
  the live UI brand blue below — for screen/social work always use the live token `#0E70F1`.*
- **Assets:** `apps/www/public/favicon.svg`, `apple-touch-icon.png`, `web-app-manifest-{192,512}.png`.

**Wordmark rule:** the logo is monochrome (ink on light / white on dark). It does **not** use the
brand blue or gradients — color lives in the UI, never in the mark. Keep it that way for social
avatars and watermarks.

### 2.1 Logo asset inventory (for social, decks, docs)

The in-app nav/footer render the wordmark as **live styled text** (`components/shared/altruvex-logo.tsx`
— `font-sans font-semibold uppercase tracking-[-0.05em]`, not an image), so there is no in-app logo
*file* to grab. For anything that needs a flat image — Canva, slides, social avatars, watermarks —
use the standalone exported files instead:

| File | Use |
|---|---|
| `apps/www/public/altruvex-logo(dark).png` | Dark wordmark — for **light backgrounds** (paper `#FAFAFA` / white). |
| `apps/www/public/altruvex-logo(white).png` | White/light wordmark, square crop — for **dark backgrounds** (`#121212`) and square social avatars. |

These are the only canonical logo image assets outside the favicon/PWA set — don't recreate the
wordmark by hand in a design tool; place one of these two files and resize, never recolor.

---

## 3. Color System

Colors are authored as **HSL channel tokens** (e.g. `214 89% 48%`) and consumed via `hsl(var(--x))`.
This is the canonical format — paste these straight into Figma/Canva HSL fields, or use the hex
approximations for quick work.

### 3.1 Brand Blue (the one true accent)
| Token | HSL | Hex (approx) | Use |
|---|---|---|---|
| `--brand` | `214 89% 48%` | `#0E70F1` | Primary brand fill, buttons, focus rings |
| `--brand-hover` | `214 89% 41%` | `#0C5FCE` | Hover state |
| `--brand-text` (light) | `214 90% 43%` | `#0B63D0` | Brand color **as text** (AA-safe on light) |
| `--brand-text` (dark) | `214 95% 64%` | `#5AA4F8` | Brand text on dark |

> The brand blue is **deliberately a single, deep, confident blue** — not "generic SaaS blue." It was
> darkened to 48% so white-on-brand passes WCAG AA (4.66:1). Don't lighten it on marketing assets.

### 3.2 Neutral ramp (the backbone — most of the UI is greyscale)
The site is **mostly black-and-white**; color is used sparingly for emphasis. The neutral scale:

| Token | HSL | Hex | Role |
|---|---|---|---|
| `--n-0` | `0 0% 98%` | `#FAFAFA` | Light background |
| `--n-1` | `0 0% 96%` | `#F5F5F5` | |
| `--n-2` | `0 0% 91%` | `#E8E8E8` | Muted / borders |
| `--n-3` | `0 0% 84%` | `#D6D6D6` | |
| `--n-4` | `0 0% 65%` | `#A6A6A6` | |
| `--n-5` | `0 0% 45%` | `#737373` | Muted foreground |
| `--n-6` | `0 0% 32%` | `#525252` | |
| `--n-7` | `0 0% 18%` | `#2E2E2E` | |
| `--n-8` | `0 0% 6%` | `#0F0F0F` | Ink / primary text |

**Light theme:** background `#FAFAFA`, text `#0F0F0F`, cards pure white `#FFFFFF`.
**Dark theme:** background `0 0% 7%` (`#121212`), text `0 0% 94%` (`#F0F0F0`), cards `0 0% 9%` (`#171717`).
Dark mode adds a subtle brand-tinted radial glow at the top of the page (6% opacity).

### 3.3 Section "Color Worlds" (orange / green / blue)
Different sections are scoped to a **local accent color world** via `--local-accent`. This is how the
site stays mostly-mono but gives each section a quiet identity. All three are AA-audited in both modes.

| World | Light HSL | Dark HSL | Meaning / where used |
|---|---|---|---|
| **Blue** | `214 90% 43%` | `214 89% 48%` | Default. Hero, trust, transparency. The brand world. |
| **Orange** | `27 90% 35%` | `27 96% 58%` (`~#F8842B`) | Action / conversion. Services, pricing, all closing CTAs. |
| **Green** | `158 64% 30%` | `158 64% 46%` (`~#2BC089`) | Proof / "in production." Work, pipeline, e-commerce proof. |

**Social rule:** match the world to the message — **blue = the brand/architecture**, **orange = the
call to action / pricing**, **green = proof & shipped work.** Don't mix more than one world per asset.

### 3.4 Gradient Accent Palette (display-only, headline color)
For value-prop / outcome phrases the site uses multi-stop gradients (`bg-clip-text`). These are
**decorative display color** — headline-only, **never body text**. 11 named gradients, each with a
light and a dark/inverted variant. Stops are `from → via → to`:

| Name | Light stops (HSL) | Feel / pairs with |
|---|---|---|
| `brand` | `214 90% 44%` → `224 84% 50%` → `236 80% 56%` | Blue→indigo. Default. |
| `iris` | `218 86% 48%` → `250 76% 58%` → `272 72% 56%` | Blue→violet. Hero. **Blue world.** |
| `ocean` | `198 88% 42%` → `206 86% 46%` → `220 84% 52%` | Cyan→blue. |
| `ember` | `36 94% 46%` → `24 92% 48%` → `12 88% 50%` | Amber→burnt-orange. CTAs. **Orange world.** |
| `sunset` | `30 94% 52%` → `12 88% 56%` → `344 84% 60%` | Orange→pink. |
| `forest` | `162 70% 34%` → `152 62% 38%` → `168 72% 36%` | Deep green. **Green world (proof).** |
| `mint` | `150 64% 38%` → `168 70% 38%` → `184 78% 38%` | Green→teal. **Green world.** |
| `aurora` | `158 64% 38%` → `200 84% 44%` → `262 72% 56%` | Green→blue→violet. |
| `lavender` | `268 70% 56%` → `290 68% 56%` → `320 70% 54%` | Violet→pink. |
| `neon` | `316 78% 50%` → `286 76% 54%` → `244 82% 56%` | Magenta→indigo. |
| `candy` | `338 78% 54%` → `8 82% 54%` → `36 90% 42%` | Pink→red→amber. |

**The gradient-matching rule (important):** the gradient must **match the section's color world**, not
contrast it. Orange-world section → `ember`. Green-world → `mint`/`forest`. Blue-world → `iris`. The
colored text should feel cohesive with that section's button + eyebrow, never a clashing rainbow.

**Rarity budget:** at most ~2 gradient accents per page; never two of the same world back-to-back.
On social, that translates to **one gradient phrase per graphic, max** — it's a spotlight, not a theme.

### 3.5 Semantic colors
| Token | HSL | Use |
|---|---|---|
| `--success` | `162 95% 31%` | Confirmation, "in production" dots |
| `--warning` | `38 96% 40%` | Caution |
| `--error` / `--destructive` | `0 65% 51%` | Errors, destructive actions |
| `--messaging-whatsapp` | `142 70% 49%` | WhatsApp brand green (contact) |

### 3.6 Tech-stack accent colors (for the "Tech DNA" section)
Brand-matched colors per technology, used in the stack visualization:
Next.js `239 84% 74%` · React `187 85% 53%` · TypeScript `217 91% 60%` · Node `142 69% 58%` ·
PostgreSQL `213 94% 68%` · Prisma `258 90% 76%` · Tailwind `187 85% 53%` · Vercel `240 5% 90%` · VPS `215 16% 65%`.

### 3.7 Surface / elevation tokens (`--s-*`)
A parallel opacity-based scale for layering UI on either background, e.g. `--s-high` (90% ink),
`--s-mid` (72%), `--s-low` (52%), `--s-muted` (40%), `--s-surface` (4% tint), `--s-border` (10%).
These keep elevation consistent across light/dark/inverted scenes.

### 3.8 Text selection & misc
- **Selection highlight:** brand blue at 14% opacity (`::selection`).
- **Inverted scenes** (`data-scene="inverted"`): dark islands inside light pages (and vice-versa) —
  used for final CTAs and audit panels. They flip the full token set so contrast holds.

### 3.9 Color usage — when to use each color (by case)

This is the decision layer: given *what* you're coloring, *which* token to reach for. Frequencies in
parentheses are how often each appears in the live `components/` + `app/` (a signal of "default" vs
"rare"). **Rule of thumb: 90% of every screen is greyscale; color is an event, not a surface.**

**Text — pick by the role of the words, not by taste:**
| You are coloring… | Use | Condition / why |
|---|---|---|
| Primary copy, headings, ink | `text-foreground` | Default for all reading text. Auto-flips in dark mode. |
| Secondary / supporting copy, captions | `text-muted-foreground` | Anything subordinate to the main line. |
| The dismissed half of an "X — not Y" line | `text-foreground/60` (the `<Dim>` primitive) | **Only** for the rejected alternative. Never for normal de-emphasis. |
| A section heading's craft/restraint clause | `text-foreground/45` (via `<Highlight>`) | Set automatically by `SectionHeading` when no `accent`. |
| Brand blue **as literal text** | `text-brand-text` (4×) | Rare. Use **only** when you need the brand blue on text *outside* a color-world context (e.g. an inline link in prose, a standalone brand mention). AA-safe both modes. |
| A section's accent text (eyebrow tone, accent mark, active state) | `text-local-accent` (18× — the workhorse) | The **default way to put color on text.** It follows the section's world (blue/orange/green), so it's always world-correct. Prefer this over `text-brand-text`. |
| Layered text on an unknown/tinted surface | `text-s-high / -mid / -low / -muted` (90/72/52/40% ink) | When you don't know the underlying bg (cards, glass, inverted islands) and need contrast to hold. |

**Backgrounds, surfaces, borders:**
| Case | Use | Condition |
|---|---|---|
| Page background | `bg-background` | `#FAFAFA` light / `#121212` dark. Pick one mode, commit. |
| A card / raised panel | `bg-card` (white / `#171717`) or `bg-surface` | `bg-card` for floating cards; `bg-surface` for subtle inset tint. |
| Hairline divider / cell border | `border-border` (10% ink) | The standard separator (`border-t border-border` between sections). |
| A stronger border (emphasis, active cell) | `border-border-mid` (18% ink) | When the hairline is too faint to read. |
| Section identity tint | `accent-world-{blue\|orange\|green}` on the `<section>` | One per section. Everything inside reads `--local-accent`. |

**Brand blue (`--brand`, `#0E70F1`) — fills, not text:**
| Case | Use | Condition |
|---|---|---|
| Focus ring on any control | `ring-brand` / the focus-visible outline | Always. Non-negotiable accessibility default. |
| A literal "brand-blue" button | `bg-brand` (16×) + `bg-brand-hover` on hover | Use sparingly — **not** the primary CTA (that's ink). For brand-flagged actions only. |
| Selection highlight, top-of-page glow | `--selection-accent`, dark-mode radial glow | Automatic; don't override. |
| ⚠️ Don't | brand blue on a nav CTA, or as body text | A blue nav button reads "generic SaaS"; nav CTA stays **ink**. Brand blue is a fill/focus color, not a text color (use `text-brand-text` for that). |

**Local-accent (the section's color world) — the primary "colorful" channel:**
| Case | Use | Condition |
|---|---|---|
| The closing/conversion CTA inside a section | `bg-local-accent text-local-accent-fg` (3×) | In an **orange** world → an orange button; in green → green. The button inherits the world. |
| Eyebrow accent, active dot, small accent mark | `text-local-accent` | Default colored-text move (see above). |
| Soft accent wash behind a focal element | `bg-local-accent-soft` (~8% tint) | Subtle background emphasis, world-matched. |

**Worlds — choose by the section's *job* (from §3.3):**
- **Blue** → brand, architecture, trust, transparency, hero. The default; use when in doubt.
- **Orange (27°)** → action: services, pricing, lead capture, every closing CTA.
- **Green (158°)** → proof: shipped work, "in production," the pipeline.
- *One world per section. Never mix two worlds in one asset.*

**Gradients (`<Accent>`, display-only) — headline color, must match the world:**
- Blue world → `iris` (or `brand`/`ocean`). Orange world → `ember` (or `sunset`). Green world → `mint`/`forest`.
- **Conditions:** headline/value-prop text only — never body. ≤2 per page. Never two same-world adjacent. One gradient phrase per social graphic, max.

**Semantic colors — state signals, never decoration:**
| Color | Use **only** when… | Real usage |
|---|---|---|
| `--success` (`162 95% 31%`) | confirming success / marking "in production" status dots | `bg-success` (6×), `text-success` (5×) |
| `--warning` (`38 96% 40%`) | cautioning the user (non-blocking) | rare |
| `--error` / `--destructive` (`0 65% 51%`) | a real error or a destructive action — incl. **form validation** (`aria-invalid`) | `text-destructive` (19×), `border-destructive` (15×) — mostly forms (§7.4) |
| `--messaging-whatsapp` (`142 70% 49%`) | a WhatsApp contact affordance specifically | 2× (contact only) |

> Semantic colors are **off-limits for emphasis or branding.** Green means "succeeded," not "nice."
> If you want approving color, use the green *world*, not `--success`.

**Tech-accent colors (`--tech-accent-*`):** *only* inside the Tech-DNA stack visualization
(§3.6 / §10.11). Each maps to a technology's brand color (Next.js, React, TS, Node, Postgres, Prisma,
Tailwind, Vercel, VPS). **Never** reuse these elsewhere — outside that one section they read as random.

**Glow / elevation accents:** `--shadow-glow-sm` / `--shadow-glow` (brand-blue glow) only on a single
focal element (a primary CTA, a hero accent). Not on cards in a grid — that's what `--shadow-card` is for.

**The one-line decision tree:**
> Reading text → `foreground`/`muted-foreground`. Need *one* spot of color → `text-local-accent`
> (it's already the right world). A button that must pop → `bg-local-accent` in an orange section.
> Reporting state → semantic (`success`/`destructive`). Everything else stays greyscale.

---

## 4. Typography

Four typefaces, each with a strict job. All loaded via `next/font/google`.

| Font | Token | Role |
|---|---|---|
| **Outfit** | `--font-outfit` (`--font-sans`) | **Headings & display.** Geometric, tight, confident. |
| **Inter** | `--font-inter` (`--font-body`) | **Body copy** (Latin). Neutral, legible. |
| **Geist Mono** | `--font-geist-mono` (`--font-mono`) | **Eyebrows / kickers / labels / numbers.** The "engineering" signal. |
| **Vazirmatn** | `--font-vazirmatn` | **All Arabic** (RTL) — body + headings. |
| Georgia (serif) | `--font-serif` | Only inside the `<Highlight>` emphasis (serif-italic). |

### 4.1 Type scale (clamped, responsive)
| Level | Font | Size (clamp) | Weight | Tracking | Leading |
|---|---|---|---|---|---|
| `.display` | Outfit | `clamp(3rem, 6vw, 5.5rem)` | 700 | -0.04em | 1.0 |
| `h1` | Outfit | `clamp(3rem, 5vw, 4.5rem)` | 700 | -0.03em | 1.02 |
| `h2` / `.section-title` | Outfit | `clamp(2.125rem, 4vw, 3.25rem)` | 600 | -0.02em | 1.08 |
| `h3` | Outfit | `clamp(1.5rem, 2.4vw, 2rem)` | 600 | -0.018em | 1.15 |
| `h4` | Outfit | `clamp(1.125rem, 2vw, 1.75rem)` | 500 | -0.015em | 1.2 |
| Body | Inter | `clamp(17px, 1.05vw, 18px)` | 400 | normal | **1.75** |
| `.eyebrow` | Geist Mono | `0.875rem` | 400 | **0.22em**, UPPERCASE | 1.5 |
| `.label` | Inter | `12px` | 500 | 0.01em | 1.4 |
| `.caption` | Inter | `11px` | 400 | normal | 1.5 |

**Headline character:** large, tight (negative tracking), heavy weight. Big type is the brand's
default voice — confident and spacious. Body is generously leaded (1.75) for calm readability.

### 4.2 The Eyebrow (signature element)
The **monospace, uppercase, wide-tracked kicker** above section titles is a core brand signal — it
reads as "engineering / spec sheet." Often numbered: `02 — What We Build`, `03 — Delivery Model`,
`07 — Let's Build`. **Always include an eyebrow on a branded graphic** — it's the cheapest way to make
something instantly look like Altruvex.

### 4.3 RTL / Arabic
- Arabic uses **Vazirmatn** for everything; letter-spacing is forced to `0` (Latin tracking breaks Arabic).
- Eyebrows in Arabic drop the uppercase transform and the wide tracking.
- The serif-italic `<Highlight>` falls back to **sans bold** in Arabic (italics don't suit Arabic).
- Body line-height is looser in Arabic (1.9).

---

## 5. The Emphasis System (the brand's typographic signature)

This is the most distinctive part of Altruvex's design language. Headlines and body copy are split
into a base clause + an **emphasized clause**, using four primitives (`components/ui/emphasis.tsx`).
**Pick the primitive per phrase, by meaning:**

| Primitive | Looks like | Used for | Example |
|---|---|---|---|
| **`<Highlight>`** | dimmed **serif italic**, light weight | restraint / craft / precision / trust / *loss-framed* lines | *"every time."* · *"the project."* · *"should not be a gamble."* |
| **`<Accent>`** | **gradient color** (world-matched) | commercial outcomes / value props / conversion phrases | *"a direct technical conversation."* · *"revenue"* |
| **`<Strong>`** | semibold, full-ink | the core claim inside body copy | *"full source code ownership"* |
| **`<Dim>`** | foreground at 60% | the dismissed half of an "X — not Y" contrast | *"not templates with a brand coat."* |

**Decision rule:** *calm/precision/quality/risk → Highlight (serif-italic).* *Bold/value/conversion →
Accent (gradient).* Loss- or risk-framed phrases stay Highlight even if they're conversion-y —
coloring a warning is tonally wrong (e.g. *"a gamble."* / *"compounds in cost."* stay serif-italic).

**Body-copy doctrine:** ≤1 emphasis idea per paragraph. `<Strong>` on the core claim, `<Dim>` on the
rejected alternative. Never put color or serif-italic in body — those are headline-only treatments.

> **For social:** this two-tone headline (plain text + one emphasized clause) is *the* layout to
> reuse. Set the headline in Outfit, then render the final clause either in **serif-italic grey**
> (Highlight) or in **one world-matched gradient** (Accent). One emphasis per graphic.

---

## 6. Spacing, Radius, Elevation, Texture

### 6.1 Radius (base `--radius: 0.5rem` = 8px)
Scales from `xs` (4px) → `3xl` (24px). Semantic aliases: `--radius-surface` (cards, 12px),
`--radius-overlay` (popovers, 16px), `--radius-section` (large blocks, 20px), `--radius-nested` (6px).
Buttons use a small radius (`rounded-sm`) — corners are **restrained, not pill-shaped.**

### 6.2 Section rhythm
Vertical section padding: `--section-y-top: clamp(5rem, 10vh, 8rem)` and
`--section-y-bottom: clamp(5rem, 14vh, 10rem)`. **Generous whitespace is part of the premium feel** —
sections breathe; don't crowd social layouts either.

### 6.3 Elevation (shadows)
| Token | Use |
|---|---|
| `--shadow-card` | Default card lift (very subtle) |
| `--shadow-card-lg` | Hover / featured card |
| `--shadow-glow-sm` / `--shadow-glow` | Brand-blue glow (8–24px) for focal accents |

Shadows are **soft and low** in light mode, deeper in dark. The aesthetic is flat-with-a-whisper,
not heavy material drop-shadows.

### 6.4 Texture & glass
- **Film grain** (`.grain-overlay`): a 3%-opacity fractal-noise overlay that keeps large flat areas
  from feeling sterile. Subtle — a texture you feel, not see.
- **Liquid glass** (`.liquid-glass`, `.liquid-glass-panel`): frosted, blurred, saturated panels for
  nav and overlays. Light gradient + backdrop-blur + inset highlight. Degrades gracefully when the
  user prefers reduced transparency.

---

## 7. Components (visual language)

### 7.1 Buttons (`components/ui/button.tsx`)
| Variant | Look |
|---|---|
| `default` | Ink fill (primary), white text — the standard CTA |
| `brand` | Brand-blue fill, white text |
| `outline` | Bordered, transparent — secondary |
| `ghost` | No border, hover tint |
| `link` | Underline on hover |

Sizes: `sm` 32px · `default` 40px · `lg` 44px · `xl` 48px. Small radius, `font-medium`, micro press
animation (`active:scale-[0.98]`), 200ms transitions, built-in `loading` spinner state.
**Note:** the nav CTA is intentionally **neutral ink, not blue** — a blue nav button reads as "generic
SaaS." Keep primary CTAs confident and restrained.

### 7.2 Cards
White (`#FFFFFF`) on light / `#171717` on dark, `--radius-surface` (12px), `--shadow-card`. Connected
grid sections use 1px-gap borders rather than floating cards (alignment over decoration).

### 7.3 Focus & accessibility (non-negotiable, it's a brand value)
- Visible focus ring on everything (`focus-visible: 2px brand outline, offset`).
- Contrast: AA floor (4.5:1) on accent surfaces; body copy aims higher.
- WCAG 2.1 AA is a *build requirement*: *"If it is not accessible, it is not finished."*
- Honor `prefers-reduced-motion` and `prefers-reduced-transparency` — both have CSS fallbacks.

### 7.4 Form inputs (`components/ui/input.tsx`)

The form language is **underline, not box** — this is a deliberate, recognizable choice. Inputs have
no border except a single hairline on the bottom edge; they sit flush with no horizontal padding, so
a form reads as a stack of typographic lines rather than a grid of boxes.

`input.tsx` exports three controls that **share one base** (`formControlClasses`):

| Export | Element | Notes |
|---|---|---|
| `Input` | `<input>` | + file-input styling (`file:h-7`, transparent, no border) |
| `Textarea` | `<textarea>` | adds `resize-none` |
| `SelectField` | `<select>` | same underline treatment as text inputs |

The shared base (verbatim intent):
```
w-full min-w-0 min-h-11 rounded-none bg-transparent px-0 py-2.5    // flush, square, 44px min target
text-base md:text-sm text-foreground
placeholder:text-muted-foreground
border-b border-border                                            // the only border — bottom hairline
transition-[color,border-color,outline-color] duration-(--duration-instant) ease-(--ease-default)
focus-visible:border-ring focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring
aria-invalid:border-destructive aria-invalid:focus-visible:border-destructive aria-invalid:focus-visible:outline-destructive
```

**States:**
- **Default** — bottom hairline `border-border`, transparent fill, muted placeholder.
- **Focus** — border becomes `ring` (brand) **and** a 2px offset brand outline appears.
- **Invalid** (`aria-invalid`) — border + focus outline flip to `destructive`.
- **Disabled** — inherit the standard `disabled:opacity-50` / `pointer-events-none` convention.

Transitions run at `--duration-instant` (120ms) — inputs respond **immediately**, no easing-in lag.

**Related form components** (Radix/headless, same token system, not detailed here): `label.tsx`,
`select.tsx`, `popover.tsx`, `accordion.tsx`, `scroll-area.tsx`, and the date/time pickers
(`calendar.tsx`, `date-picker.tsx`, `time-picker.tsx`).

**Social/brand note:** when mocking a form in a graphic, draw inputs as **underlines, never as
rounded boxes** — the box style reads as generic SaaS and breaks the brand.

### 7.5 Iconography

**Icon set:** [Lucide](https://lucide.dev) (`lucide-react`) exclusively — no other icon library appears
anywhere in the codebase. Lucide's style is the brand's icon style: **thin-stroke, geometric, no fill,
no duotone.** It pairs with the Outfit/Geist Mono type system (both are geometric/technical) and the
"engineering, not decoration" voice (§1) — icons read as functional markers, not illustration.

- **Default stroke/size:** rendered at its default `strokeWidth` (2) and small UI sizes (`h-4 w-4` /
  `h-5 w-5`); icons are never blown up into a graphic centerpiece.
- **Color:** icons inherit text-token color (`text-foreground`, `text-muted-foreground`, or the
  semantic/local-accent tokens from §3.9 when they signal state) — never a raw hex, same rule as everything else.
- **Role:** strictly functional — nav, form affordances (calendar, phone, mail), state (check, alert,
  loading spinner), callout markers (§7.5→7.6 below). **Never decorative** filler in a layout.
- **Social rule:** if a social graphic needs an icon (e.g. a checklist, a stat callout), pull from
  Lucide at the same thin-stroke weight — don't introduce a rounder/filled icon set, it will clash
  with the rest of the brand's geometric language.

### 7.6 Imagery & photography direction

The live product **does not use photography or illustration as a design element.** There is no
photo/illustration system to extend — sections are built from type, color tokens, geometric line/grid
overlays (e.g. `ServiceHero`'s grid-line overlay, §10.5), shadows, and grain texture (§6.4), not images.

**What this means for social/decks:**
- **Default to type-and-token graphics** (the §9 recipe) — headline + eyebrow + emphasis + worlds — not
  stock photography or generic illustration. A photo-led post is the fastest way to look like a
  generic agency, which is the brand's named enemy (§1).
- **Real screenshots of shipped work** are the one legitimate "imagery" — framed plainly (browser
  chrome or device frame, no heavy drop-shadow/glow beyond `--shadow-card`), used as **proof** (green
  world, §3.3), never as decoration.
- **If a graphic genuinely needs a photo** (e.g. a founder/team photo for "founder-direct" credibility),
  keep it desaturated-adjacent and let typography carry the composition — the photo supports the claim,
  it doesn't replace it.
- **Never:** stock-photo hero shots, generic "team high-fiving" imagery, gradient-mesh abstract blobs,
  3D-rendered hero objects, or AI-illustration filler — none of that exists in the product and it would
  read as off-brand immediately.

### 7.7 Article / MDX components (`components/mdx/`)

Long-form articles (`contents/articles/{en,ar}/*.mdx`) render through `mdx-components.tsx`, which
maps raw markdown elements to brand-token components — **never raw Tailwind color utilities**, same
rule as §10.2.

| Component | File | Pattern |
|---|---|---|
| `Callout` | `callout.tsx` | `info/warning/success/danger` → `bg-{token}/10 border-{token}/30 text-foreground` (info uses `bg-brand-soft border-brand/25`). Icon tinted via a matching `text-{token}` map. Never `bg-blue-50`-style raw color. |
| `Quote` | `quote.tsx` | `border-local-accent` side rule (2px) + blockquote text wrapped in `<Highlight>` (serif-italic, §5) — quotes are a craft/restraint moment, not a conversion one. Attribution is `font-mono` `<Strong>{author}</Strong>`, role in `text-muted-foreground`. |
| `Mark` | `mdx-components.tsx` | A thin wrapper over `<Accent gradient="…">` for use **inside MDX prose** — the article's "one defining claim," not a highlighter. Used at most once or twice per article (e.g. `<Mark gradient="ember">-2,400%</Mark>` for an ROI stat). Same ≤2-per-page, world-matched budget as `<Accent>` (§3.4/§5). |

MDX's default `strong`/`em` markdown elements are remapped to the brand primitives, not left as raw
`<b>`/`<i>` — so writing plain `**bold**`/`*italic*` in an `.mdx` file already gets brand treatment for
free: `strong` → `<Strong>` (semibold core claim), `em` → `<Highlight>` (serif-italic, craft/restraint).

Article headings (`h1`–`h3` in `mdx-components.tsx`) intentionally **diverge from the §4.1 site-wide
type scale** — they're lighter (`font-normal`, not the 600/700 of `h1`–`h3` elsewhere) and use their
own clamp ranges (`h1` `clamp(2.25rem,4.2vw,3.5rem)` down to `h3` `clamp(1.25rem,2.2vw,1.625rem)`),
matching prose rhythm rather than hero/section-heading weight.

**Rule:** any new MDX component follows the same constraint as components — pull color from
`--brand`/`--success`/`--warning`/`--destructive`/`--local-accent` tokens, emphasis from
`emphasis.tsx` primitives, never an ad-hoc Tailwind palette class.

---

## 8. Motion

- **Engine:** GSAP 3 + Lenis smooth-scroll (**not** Framer Motion).
- **Signature:** headlines split into words and **rise + stagger** on scroll into view. Gradient
  accents animate per-word but share one continuous gradient sweep across the phrase.
- **Easing:** UI transitions `cubic-bezier(0.4, 0, 0.2, 1)` (`ease.ui`); text reveals / entrances `cubic-bezier(0.2, 0, 0, 1)` (`ease.text`). Also available: `smooth` `(0.25, 0.46, 0.45, 0.94)`, `gentle` `(0.65, 0, 0.35, 1)`, `strong` `(0.23, 1, 0.32, 1)`, `exit` `(0.55, 0, 1, 0.45)`.
- **Durations:** `--duration-instant: 120ms`; UI transitions ~200ms; reveals ~350ms.
- **Character:** motion is *purposeful and quick* — reveals, not decoration. Everything respects
  reduced-motion (collapses to near-instant).

For video/social motion, mirror this: text rises and settles with a tight ease, one element at a
time, fast. No bouncing, no spinning, no gratuitous loops.

---

## 9. Translating This to Social Media

A repeatable recipe so every post is unmistakably Altruvex:

**Layout skeleton**
1. **Eyebrow** — Geist Mono, UPPERCASE, wide tracking, optionally numbered (`03 — STANDARDS`). Muted grey or world-accent.
2. **Headline** — Outfit, big, tight, heavy. Two clauses: plain + one emphasized clause.
3. **Emphasis** — the final clause is either **serif-italic grey** (Highlight, for craft/restraint)
   or **one world-matched gradient** (Accent, for value/conversion). Never both.
4. **Body / supporting line** — Inter, calm, with a single `<Strong>` claim and a `<Dim>` "…not Y."
5. **Footer/sign-off** — wordmark (mono ink/white) + a terse proof or CTA.

**Color**
- Background: off-white `#FAFAFA` **or** near-black `#121212`. Pick a mode and commit.
- Pick **one color world** for the post: blue (brand/architecture), orange (CTA/pricing), green (proof/work).
- Color appears **only** on the emphasized clause, the eyebrow, or a single accent mark. Everything
  else is greyscale. Restraint is the brand.

**Copy**
- Lead with a number or a hard claim. End sentences with periods. No hype words. No emoji decoration.
- Use the "X — **not Y**" structure wherever possible.
- Pull from §1's stock lines when you need a safe, on-brand anchor.

**Texture**
- Add a barely-there grain over flat backgrounds. Keep shadows soft and low. Generous margins.

**The litmus test:** *Could a competitor swap their logo onto this post and have it still work?*
If yes, it's too generic — sharpen the claim, name the alternative you reject, tighten the type.

### 9.1 Arabic stock lines (pulled verbatim from `messages/ar.json`)

§1's stock lines are English-only; for Arabic posts, use the site's own shipped translations rather
than re-translating from scratch (Arabic copy here is RTL-native, not a mirrored translation — see §4.3):

| English anchor | Arabic (verbatim from the site) |
|---|---|
| "Build the system your revenue depends on." | "ابنِ النظام الذي يعتمد عليه نمو إيراداتك." |
| "Architecture first. Performance by default." | "التخطيط أولاً. الأداء يتبعه بعد ذلك." |
| "Clear engineering." | "تطوير واضح." |

When writing a *new* Arabic line that isn't in `messages/ar.json` yet, match this register: direct,
unhedged, no exclamation marks, same "X — not Y" contrast idiom translated naturally (not word-for-word)
— and set it in **Vazirmatn**, never Outfit/Inter (§4.3), with letter-spacing at `0`.

### 9.2 Platform sizing reference

A starting canvas size per platform — treat these as the safe-area default, not a hard rule:

| Platform | Recommended canvas | Notes |
|---|---|---|
| X / Twitter (single image) | `1200×675` (16:9) | Matches the site's own OG-image size (`opengraph-image.tsx`). |
| LinkedIn (single image) | `1200×627` | Crops aggressively in-feed — keep headline + emphasis in the center ~80%. |
| Instagram feed | `1080×1080` (1:1) | Square — the eyebrow/headline/emphasis stack (§9 layout skeleton) reads well centered. |
| Instagram / LinkedIn story | `1080×1920` (9:16) | Stack the same 5-part skeleton vertically; keep the footer/wordmark inside the bottom safe area (~250px up from the edge). |
| Carousel slides (any platform) | `1080×1350` (4:5) | One layout-skeleton element emphasized per slide rather than cramming all five onto every slide. |

Whatever the canvas, the layout skeleton, color-world rule, and "one emphasis per graphic" budget
from §9 above don't change — only the aspect ratio does.

---

## 10. How to Build (Implementation Patterns)

This is the **code-level "how"** — how fonts are wired, how colors are applied in JSX, and how every
section is actually assembled. Files cited are under `apps/www/`.

### 10.1 How the FONTS are wired

Fonts load once in `app/[locale]/layout.tsx` via `next/font/google`, each exposing a CSS variable.
The variables are attached to `<body>`; the CSS in `globals.css` (`@theme inline`) maps them to
Tailwind font utilities.

```tsx
// app/[locale]/layout.tsx
const inter     = Inter({     subsets:["latin"],  weight:["400","600"],            variable:"--font-inter" });
const outfit    = Outfit({    subsets:["latin"],  weight:["400","500","600","700"], variable:"--font-outfit" });
const geistMono = Geist_Mono({subsets:["latin"],  weight:["400","500"],            variable:"--font-geist-mono" });
const vazirmatn = Vazirmatn({ subsets:["arabic"], weight:["400","500","600","700"], variable:"--font-vazirmatn" });

// The body font swaps by locale; Outfit + Geist Mono are always present:
const primaryFontVariable = locale === "ar" ? vazirmatn.variable : inter.variable;
<body className={cn(primaryFontVariable, outfit.variable, geistMono.variable)}>
<html dir={locale === "ar" ? "rtl" : "ltr"}>
```

The `globals.css` `@theme` block maps them so you use them as **Tailwind classes**, never raw CSS:

| Want | Class | Resolves to |
|---|---|---|
| Heading font | `font-sans` | Outfit (or Vazirmatn in RTL) |
| Body font | `font-body` | Inter |
| Eyebrow / mono | `font-mono` | Geist Mono |
| Serif (Highlight only) | `font-serif` | Georgia |

**You almost never set the font by hand** — `<h1>`–`<h4>` already use Outfit via base styles in
`globals.css`, and `<body>` is Inter. You only reach for `font-mono`/`font-serif` for eyebrows and
emphasis. To build a headline, just write an `<h1>`/`<h2>` and it inherits the right font, size,
weight, and tracking automatically.

### 10.2 How the COLORS are applied (in JSX)

**Never hardcode a hex in a component.** Every color is a token exposed as a Tailwind utility. Usage:

```tsx
// Text colors
text-foreground          // primary ink (auto-flips in dark mode)
text-muted-foreground    // secondary / supporting copy
text-foreground/60       // ad-hoc dimming (the <Dim> primitive = /60)
text-brand-text          // brand blue AS TEXT (AA-safe both modes)
text-local-accent        // the current section's color world (blue/orange/green)

// Backgrounds & borders
bg-background  bg-card  bg-surface  bg-brand  bg-success/error/warning
border border-border        // hairline (10% ink)
border border-border-mid    // stronger hairline (18%)

// Surface opacity scale (layering on any bg)
text-s-high  text-s-mid  text-s-low  text-s-muted   // 90/72/52/40% ink, theme-aware
```

**The Color-World pattern** — this is how a section gets its identity. Put a world class on the
`<section>` (or any wrapper); everything inside reading `local-accent` follows it:

```tsx
import { accentWorldClass } from "@/lib/config/accent-world";

<section className={accentWorldClass("orange")}>   {/* or "green" / "blue" */}
  <Eyebrow tone="accent">Pricing</Eyebrow>          {/* now orange */}
  <Button className="bg-local-accent text-local-accent-fg">Get Estimate</Button>
</section>
```
Worlds: **blue = brand/architecture · orange = CTA/pricing · green = proof/shipped work.** One world
per section. (The class names `accent-world-blue/-orange/-green` are defined in `globals.css` with
AA-audited light + dark variants.)

**The Gradient-Accent pattern** — colored value-prop text via the `<Accent>` primitive:
```tsx
<Accent gradient="ember">scope your build?</Accent>   // orange world → ember
<Accent gradient="iris">revenue</Accent>              // blue world  → iris
```
Match the gradient to the section's world. Headline-only. ≤2 per page, never two same-world adjacent.

### 10.3 The layout shell: `Container` + section rhythm

Every section follows the same outer skeleton: a full-bleed `<section>` for background/world, a
`Container` for the max-width gutter, then content.

```tsx
// Container = mx-auto, max-w-352 (~1408px), responsive px (6→8→12→16)
<section className="border-t border-border pt-(--section-y-top) pb-(--section-y-bottom)">
  <Container>
    {/* content */}
  </Container>
</section>
```
- **Vertical rhythm:** always `pt-(--section-y-top) pb-(--section-y-bottom)` (the clamp-based tokens).
- **Section dividers:** a top hairline `border-t border-border` is the standard separator.
- **Max width:** `Container` caps at `max-w-352`; content blocks often cap tighter (`max-w-5xl`,
  `max-w-[52ch]` for prose) — generous whitespace is intentional.

### 10.4 The canonical section header: `<SectionHeading>`

Don't hand-roll section titles — use `components/sections/section-heading.tsx`. It composes the
Eyebrow + `<h2>` + optional emphasized second clause + side description, and wires the motion refs.

```tsx
<SectionHeading
  titleId="problem-section-heading"     // for aria-labelledby (set on the <h2>)
  eyebrow={t("eyebrow")}                 // mono kicker (rendered via <Eyebrow>)
  firstTitle={t("title")}               // plain clause
  secondTitle={t("titleAccent")}        // emphasized clause (optional)
  accent="ember"                        // ← provide a gradient → renders <Accent>; OMIT → renders <Highlight>
  description={t("subtitle")}           // optional supporting copy (sits bottom-right on lg+)
  eyebrowRef={eyebrowRef}               // motion refs (see 10.6)
  titleRef={titleRef}
  descriptionRef={bodyRef}
/>
```
**Full prop surface** (from `section-heading.tsx`) — the above is the common subset; these extras exist:

| Prop | Default | Effect |
|---|---|---|
| `accent` | — | Gradient name → second clause is an `<Accent>`. Omit → `<Highlight>`. |
| `accentDirection` | `"r"` | Gradient sweep direction passed to `<Accent>` (`r`, `br`, etc.). |
| `accentAnimate` | `false` | Animates the gradient (the `text-gradient` 6s loop — see §6/keyframes). |
| `secondTitleBreak` | `true` | Forces the second clause onto its own line (`<br>` on md+); `false` keeps it inline with a space. |
| `theme` | `"default"` | `"surface"` swaps to the `s-*` token set for dark/inverted islands (eyebrow→`text-s-mid`, title→`text-s-high`). |
| `customEyebrow` | `false` | Render the `eyebrow` node as a raw `<div>` instead of wrapping it in `<Eyebrow>` (for composite kickers). |
| `classes` | — | Per-element class overrides: `{ container, titleWrapper, eyebrow, title, secondTitle, description }`. |

**Key rule:** passing `accent="<gradient>"` makes the second clause a **gradient Accent** (value/
conversion). Omitting `accent` makes it a **serif-italic Highlight** (craft/restraint). That single
prop is the Highlight-vs-Accent decision from §5, encoded.

**Two details worth knowing** (they're easy to get wrong when hand-building a heading to match):
- The `<h2>` carries `section-title font-normal` — i.e. the **weight is overridden to 400**, lighter
  than the `.section-title` base in §4.1. Section headings are deliberately *lighter* than other H2s.
- The default (non-surface) Highlight clause is `text-foreground/45` — a **specific 45% ink**, not an
  ad-hoc grey. The layout is `flex-col lg:flex-row … items-end justify-between`: title block left,
  description as a narrow column (`max-w-[20rem]`) pinned to the bottom-right on large screens.

### 10.5 Hero patterns: `<PageHero>` and `<ServiceHero>`

Two ready-made hero shells (both default to `accent-world-blue`, `min-h-screen`, centered title +
mono status pill):
- **`PageHero`** (`components/sections/page-hero.tsx`) — simple pages. Props: `eyebrow`, `title`,
  `titleItalic` (rendered as `<Highlight>`), `description`, `showStatusIndicator`, `alignCenter`.
- **`ServiceHero`** (`components/sections/service-hero.tsx`) — service pages. Adds a `watermark`,
  grid-line overlay, CTA button group, scroll hint, `titleSize="large"` option.

Hero `<h1>` is `font-sans font-light` at `clamp(3rem,5vw,4.5rem)`, tracking `-0.03em`, with the
second clause on its own line as a `<Highlight>`.

### 10.6 Motion contract (GSAP, via hooks)

Sections animate by attaching **refs from `@/lib/motion`** — you never write GSAP directly. Import the
hook, attach its ref, and the element reveals on scroll (word-split for titles, fade-rise for the rest),
with reduced-motion handled automatically.

```tsx
import { useSectionEyebrow, useSectionTitle, useSectionDescription, useSectionCardGrid } from "@/lib/motion";

const eyebrowRef = useSectionEyebrow();
const titleRef   = useSectionTitle();        // splits into .m-word, staggers up + de-blurs
const bodyRef    = useSectionDescription();
const gridRef    = useSectionCardGrid({ selector: "[data-problem-row]" }); // staggers children
```
| Hook | Animates | Default |
|---|---|---|
| `useSectionTitle` | headline, word-split | dur 1.1s, stagger 0.05, rise 40px, blur |
| `useSectionEyebrow` | kicker | delay 0 |
| `useSectionDescription` | supporting copy | delay 0.15s |
| `useSectionElement` | CTAs / misc blocks | rise 16px, delay 0.25s |
| `useSectionCardGrid` | a list/grid of children | stagger 0.08 |

Tokens live in `lib/motion/config.ts` (`MOTION.ease/duration/distance/stagger`, `SECTION_DELAYS`).
Order of appearance is always **eyebrow → title → description → element → scrollHint**.

### 10.7 Cards: `<SurfaceCard>`

```tsx
<SurfaceCard interactive>            // flat: border-border + bg-surface, hover bg shift
<SurfaceCard glass>                  // frosted liquid-glass-panel (nav/overlays)
```
Connected grids (services/work/pricing) use **1px-gap bordered cells** instead of floating cards —
alignment beats decoration, and hover reveals a tint rather than a lift.

### 10.8 Full section template (copy-paste starting point)

```tsx
"use client";
import { Container } from "@/components/shared/container";
import { SectionHeading } from "@/components/sections/section-heading";
import { useSectionEyebrow, useSectionTitle, useSectionDescription, useSectionCardGrid } from "@/lib/motion";
import { useTranslations } from "next-intl";

export function ExampleSection() {
  const t = useTranslations("example");
  const eyebrowRef = useSectionEyebrow();
  const titleRef   = useSectionTitle();
  const bodyRef    = useSectionDescription();
  const gridRef    = useSectionCardGrid({ selector: "[data-row]" });

  return (
    <section
      aria-labelledby="example-heading"
      className="accent-world-blue border-t border-border pt-(--section-y-top) pb-(--section-y-bottom)"
    >
      <Container>
        <SectionHeading
          titleId="example-heading"
          eyebrowRef={eyebrowRef} titleRef={titleRef} descriptionRef={bodyRef}
          eyebrow={t("eyebrow")}
          firstTitle={t("title")}
          secondTitle={t("titleAccent")}
          accent="iris"                         // gradient (value) — or omit for serif-italic Highlight
          description={t("subtitle")}
          className="mb-16 lg:mb-20"
        />
        <div ref={gridRef} role="list">
          {/* map rows with data-row */}
        </div>
      </Container>
    </section>
  );
}
```

### 10.9 Non-negotiable conventions (the checklist)
- **All copy comes from `messages/{en,ar}.json` via `useTranslations`** — never hardcode strings.
  Every key must exist in **both** locales. Split headlines into `title` + `titleAccent`/`titleItalic`.
- **All colors are tokens** (`text-foreground`, `bg-brand`, `text-local-accent`) — zero hex/rgb in components.
- **All fonts via Tailwind classes** — headings auto-use Outfit; only set `font-mono`/`font-serif` deliberately.
- **One color world per section**, matched gradient, ≤2 Accents/page, never same-world adjacent.
- **Section wrapper** = `pt-(--section-y-top) pb-(--section-y-bottom)` + `Container` + (usually) `border-t border-border`.
- **Motion via `useSection*` refs**, never raw GSAP. Always provide `aria-labelledby`/`titleId`.
- **RTL is first-class:** use logical classes (`inset-s-*`, `ltr:`/`rtl:` only where needed), never assume LTR.
- **Accessibility is a build gate:** semantic headings, visible focus, AA contrast, respect reduced-motion.

### 10.10 Interaction & micro-motion hooks

§10.6 covers the **reveal** hooks (`useSection*`) — entrances on scroll. There is a second family of
**interaction** hooks in `@/lib/motion` for hover/press/pointer micro-motion. All are exported from
`lib/motion/index.ts` and return a `ref` you attach to the element.

| Hook | What it does | Key options (defaults) |
|---|---|---|
| `useMagnetic` | Element drifts toward the cursor while hovered (used by `magnetic-button.tsx`). | `strength 0.35`, `max 24` (px pull), `smoothing 0.5` |
| `usePress` | Tactile scale-down on press, springs back on release. Mirrors Enter/Space for keyboard parity. | `scale 0.97`, `inDuration 0.12`, `outDuration 0.55`, `keyboard true` |
| `useTilt` | 3D tilt of a surface toward the pointer (cards). | `max 6` (deg), `perspective 800`, `lift 0` (px toward viewer), `smoothing 0.4` |
| `useParallax` | Scroll-linked parallax offset. | `ParallaxConfig` |
| `useCounter` | Counts a number up when it scrolls into view (stat blocks). | `from 0`, `to`, `duration`, `delay`, `decimals` |
| `useReveal` / `useText` / `useBatch` | Lower-level primitives the `useSection*` hooks are built on (generic reveal, word-split text, batched children). | see `config.ts` |

```tsx
import { useMagnetic, usePress, useTilt, useCounter } from "@/lib/motion";

const btnRef  = useMagnetic();              // <button ref={btnRef}>
const pressRef = usePress({ scale: 0.97 }); // tactile feedback
const cardRef = useTilt({ lift: 8 });       // <article ref={cardRef}> — 3D hover
const statRef = useCounter({ to: 99, decimals: 0 }); // <span ref={statRef}>
```

**Capability gating (important — the doc's "respect reduced-motion" line undersells this).** Every
interaction hook reads `readMotionEnv()` and **no-ops** unless the environment qualifies:
- `env.reduce` — `prefers-reduced-motion` → disabled.
- `env.fine` — requires a **fine pointer** (`pointer: fine`). Magnetic / tilt are **off on touch
  devices** by design; they never fight a finger.
- `env.constrained` — low-power / save-data contexts → disabled.

So magnetic pull and tilt are **desktop-mouse-only flourishes**; the base interaction (click, focus,
press) always works everywhere. For video/social, treat these as the "feels alive on a laptop" layer,
not core motion.

### 10.11 Section archetype index

The site is assembled from a fixed set of section components (`components/sections/`). Each follows
the §10.3 shell (full-bleed `<section>` + `accent-world-*` + `Container` + `SectionHeading`), so they
share DNA; what differs is the color world and the body composition. Reference map:

"World" below is the **verified** value from each file: **explicit** = the section sets its own
`accent-world-*` / `accentWorldClass(...)`; **inherit (blue)** = it sets none and falls back to the
root default (`--local-accent` = brand blue) unless an ancestor overrides.

| Section | File | World | Role |
|---|---|---|---|
| Hero | `hero-section.server.tsx` + `hero-motion-wrappers.tsx` | **blue** (explicit) | The opening claim; `<h1>` + status pill + scroll hint. |
| Problem | `problem-section.tsx` | inherit (blue) | Names the industry failure. Heading uses an `ember` Accent. |
| Services / What we build | `services-section.tsx` | **orange** (explicit) | Connected bordered grid of offerings. |
| Process / Delivery | `process-section.tsx` | inherit (blue) | Numbered delivery model; step dots use `--local-accent`. |
| Pipeline | `pipeline-section.tsx` | **green** (explicit) | "In production" / shipped flow. |
| Work | `work-section.tsx` (+ `work-item.tsx`) | **green** (explicit) | Proof — shipped projects. |
| Tech DNA | `tech-dna-section.tsx` | inherit (blue) | Stack visualization (uses `--tech-accent-*`). |
| Transparency | `transparency-section.tsx` | **blue** (explicit) | Published pricing / named exclusions. |
| Trust | `trust-section.tsx` | **blue** (explicit) | "What you can verify right now." |
| Pricing signal | `pricing-signal-section.tsx` | **orange** (explicit) | Pricing / conversion. |
| Consulting brief | `consulting-brief-section.tsx` | inherit (blue) | Scoping offer. |
| FAQ | `faq-section.tsx` | inherit (blue) | Accordion. |
| Audit lead capture | `audit-lead-capture.tsx` | inherit (blue) | Inline mid-article lead form (not a full bordered section) — bordered card (`border-foreground/8 bg-foreground/2 rounded-xl p-8`), eyebrow + title + 3 trust-stat mini-cards + underline phone field + `MagneticButton`. Drops below every `/writing/[slug]` article body. Same underline-input idiom as §7.4. |
| CTA / Section-end CTA | `cta-section.tsx`, `section-end-cta.tsx` | **orange** (explicit) | Closing call to action. |

**Pattern:** the explicit worlds line up with §3.3 — **orange** is set on the conversion sections
(services, pricing, CTA), **green** on the proof sections (work, pipeline), **blue** on the
brand/trust sections — while supporting sections simply inherit the blue default. Heroes
(`page-hero.tsx`, `service-hero.tsx`) default to **blue**. Use this when excerpting a section for
social: match the graphic's world to the section's verified world above.

⚠️ *Tech-debt flag:* `problem-section` inherits the **blue** world but applies an **`ember` (orange)
gradient** on its heading — a world/gradient mismatch against the §3.4 "gradient must match the
world" rule. Either intentional (problem→action framing) or a stray; worth a confirm.

---

## 11. Quick Reference Card

```
BRAND BLUE     #0E70F1   (HSL 214 89% 48%)   — the only "real" accent
INK            #0F0F0F   (HSL 0 0% 6%)        — text on light
PAPER          #FAFAFA   (HSL 0 0% 98%)       — light background
DARK BG        #121212   (HSL 0 0% 7%)        — dark background
DARK TEXT      #F0F0F0   (HSL 0 0% 94%)

WORLDS   blue=brand · orange(27°)=CTA/pricing · green(158°)=proof/work
GRADIENTS  iris(blue), ember(orange), mint/forest(green) — headline only, match the world

FONTS    Outfit (headings) · Inter (body) · Geist Mono (eyebrows) · Vazirmatn (Arabic)
EMPHASIS Highlight=serif-italic grey (craft/restraint) · Accent=gradient (value/conversion)
         Strong=core claim · Dim=the dismissed "…not Y"

VOICE    precise · technical · unhedged · anti-template · transparent · founder-direct
IDIOM    "<the standard> — not <the cheap alternative>."
TAGLINE  "Architecture first. Performance by default."
```

---

*Maintained from `apps/www`. If a token here ever disagrees with `app/globals.css`, the CSS wins —
update this doc.*
