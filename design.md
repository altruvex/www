# Altruvex — Design System & Brand Reference

> The single source of truth for everything Altruvex *looks like*, *sounds like*, and *stands for*.
> Use this when creating social posts, ads, decks, proposals, or any asset that carries the brand.
> Every value here is pulled from the live codebase (`apps/www`) — not invented. The canonical
> source is `apps/www/app/globals.css` (colors/type) and `apps/www/messages/{en,ar}/<namespace>.json` (voice).
>
> **Law layer:** the perception/typography/color rules these tokens must satisfy live in
> `docs/design-principles.md` (rules cited here as T1, C8, CI1, M2, …). This file stays the
> token layer; when a token and a principle conflict, the conflict is adjudicated in
> `docs/design-reconciliation-2026-07.md` — never silently.

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
  the live UI brand blue below — for screen/social work always use the live token `#0D6CE7`.*
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

> **Working space rule (C2/C8):** new or changed color values are *decided and verified in
> OKLCH* (perceptual lightness/chroma + measured WCAG contrast), then authored here as HSL.
> HSL channel numbers are storage, not evidence — never justify a color decision by S/L math.

### 3.1 Brand Blue (the one true accent)
| Token | HSL | Hex | Use | Measured contrast |
|---|---|---|---|---|
| `--brand` | `214 89% 48%` | `#0D6CE7` | Primary brand fill, buttons, focus rings | `--brand-foreground` (`#FAFAFA`) on it: 4.66:1 |
| `--brand-hover` | `214 89% 41%` | `#0C5CC6` | Hover state | 5.98:1 under the same text |
| `--brand-text` (light) | `214 90% 43%` | `#0B60D0` | Brand color **as text** | 5.55:1 on `#FAFAFA`, 5.80:1 on white |
| `--brand-text` (dark) | `214 95% 64%` | `#4C98FA` | Brand text on dark | 6.39:1 on `#121212`, 6.11:1 on an inverted island |

> The brand blue is **deliberately a single, deep, confident blue** — not "generic SaaS blue." It was
> darkened to 48% so the button label passes WCAG AA (4.66:1). Don't lighten it on marketing assets.
> `--brand` itself is a fill: as text on the dark background it is 3.85:1, which is why dark text
> uses `--brand-text`.

Every ratio in §3 was computed from the token values with the WCAG 2.1 formula on 2026-10-02.

### 3.2 Neutral ramp (the backbone — most of the UI is greyscale)
The site is **mostly black-and-white**; color is used sparingly for emphasis. The neutral scale:

| Token | HSL | Hex | Role |
|---|---|---|---|
| `--n-0` | `0 0% 98%` | `#FAFAFA` | Light background |
| `--n-1` | `0 0% 96%` | `#F5F5F5` | |
| `--n-2` | `0 0% 91%` | `#E8E8E8` | Muted / borders |
| `--n-3` | `0 0% 84%` | `#D6D6D6` | |
| `--n-4` | `0 0% 65%` | `#A6A6A6` | |
| `--n-5` | `0 0% 45%` | `#737373` | |
| `--n-6` | `0 0% 32%` | `#525252` | |
| `--n-7` | `0 0% 18%` | `#2E2E2E` | |
| `--n-8` | `0 0% 6%` | `#0F0F0F` | Ink / primary text |

**Light theme:** background `#FAFAFA`, text `#0F0F0F`, cards pure white `#FFFFFF`.
**Dark theme:** background `0 0% 7%` (`#121212`), text `0 0% 94%` (`#F0F0F0`), cards `0 0% 9%` (`#171717`).
**Muted text** (`--muted-foreground`) is its own value, not a ramp step: `0 0% 40%` in light
(5.50:1 on the background), `0 0% 58%` in dark (6.18:1), `0 0% 60%` on an inverted island (6.30:1).

### 3.3 Section "Color Worlds"
Different sections are scoped to a **local accent color world** via `--local-accent`. This is how the
site stays mostly-mono but gives each section a quiet identity. There are five. Blue, orange and
green carry a job site-wide; violet and cyan carry a discipline and appear on `/services` only.

| World | Light | Dark | Meaning / where used |
|---|---|---|---|
| **Blue** | `214 90% 43%` | fill `214 89% 48%`, text `214 95% 64%` | Default. Hero, trust, transparency. The brand world. |
| **Orange** | `20 92% 40%` | `27 78% 61%` (`#E9944E`) | Action / conversion. Services, pricing, closing CTAs. |
| **Green** | `158 64% 30%` | `158 36% 49%` (`#50AA89`) | Proof / "in production." Work, pipeline. |
| **Violet** | `272 72% 55%` | `268 88% 74%` | Interface design (`/services`). |
| **Cyan** | `194 88% 31%` | `190 80% 44%` | Consulting (`/services`). |

Measured contrast. "Text" is `--local-accent-text` on the page background; "fill" is
`--local-accent-fg` on `--local-accent`.

| World | Light text | Light fill | Dark text | Dark fill |
|---|---|---|---|---|
| Blue | 5.55 | 5.55 | 6.39 | 4.66 |
| Orange | 4.74 | 4.74 | 7.86 | 6.94 |
| Green | 4.84 | 4.84 | 6.65 | 5.87 |
| Violet | 5.18 | 5.18 | 6.80 | 6.00 |
| Cyan | 5.09 | 5.09 | 6.96 | 6.14 |

All clear AA (4.5:1). In light mode the fill label is `#FAFAFA`; in dark it is `0 0% 12%` ink,
except blue, which keeps the light label on the brand fill. Inside an inverted island orange, violet
and cyan switch to brighter values (orange text `30 95% 72%`, 10.41:1; violet 6.50:1; cyan
`190 80% 52%`, 8.78:1).

> **Dark-variant rule (C8):** dark-mode accents keep the hue, lift the tone, and cap OKLCH
> chroma at the light variant's chroma — dark backgrounds amplify perceived saturation. Blue is
> the one deliberate exception (the brand constant).

**Social rule:** match the world to the message — **blue = the brand/architecture**, **orange = the
call to action / pricing**, **green = proof & shipped work.** Don't mix more than one world per asset.

### 3.4 Gradient Accent Palette (display-only, headline color)
For value-prop / outcome phrases the site uses multi-stop gradients (`bg-clip-text`). These are
**decorative display color** — headline-only, **never body text**. 11 named gradients, each with a
light and a dark/inverted variant. Stops are `from → via → to`:

| Name | Light stops (HSL) | Feel / pairs with |
|---|---|---|
| `brand` | `214 90% 44%` → `224 84% 50%` → `236 80% 56%` | Blue→indigo. Default. **Blue world.** |
| `iris` | `218 86% 48%` → `250 76% 58%` → `272 72% 56%` | Blue→violet. |
| `ocean` | `198 88% 42%` → `206 86% 46%` → `220 84% 52%` | Cyan→blue. |
| `ember` | `34 94% 42%` → `24 92% 48%` → `12 88% 50%` | Amber→burnt-orange. CTAs. **Orange world.** |
| `sunset` | `28 94% 45%` → `10 86% 54%` → `340 78% 54%` | Orange→pink. |
| `forest` | `162 70% 34%` → `152 62% 38%` → `168 72% 36%` | Deep green. **Green world (proof).** |
| `mint` | `150 64% 38%` → `168 70% 36%` → `184 78% 36%` | Green→teal. |
| `aurora` | `158 64% 38%` → `200 84% 44%` → `262 72% 56%` | Green→blue→violet. |
| `lavender` | `268 70% 56%` → `290 68% 56%` → `320 70% 54%` | Violet→pink. |
| `neon` | `316 78% 50%` → `286 76% 54%` → `244 82% 56%` | Magenta→indigo. |
| `candy` | `338 78% 54%` → `8 82% 54%` → `36 90% 42%` | Pink→red→amber. |

**`world` — the gradient sections actually use.** `<Accent gradient="world">` (or
`accent="world"` on `SectionHeading`) paints from whichever `accent-world-*` class is in scope, so
the gradient cannot disagree with the section. The world classes set the stops: blue = the `brand`
stops, orange = `ember`, green = `forest`, violet `262 78% 52%` → `272 74% 55%` → `284 68% 53%`,
cyan `186 92% 27%` → `194 88% 30%` → `202 84% 34%`. Violet and cyan have no named gradient.

**Where each is used today** (2026-10-02): `world` on the Ownership Stack, Trust and closing-CTA
headings; `mint` on `/work` and the maintenance plans; every other name appears only in MDX
`<Mark>` (`iris`, `ocean`, `ember`, `sunset`, `forest`, `mint`, `aurora`, `lavender`). `neon` and
`candy` are unused.

**The gradient-matching rule (important):** the gradient must **match the section's color world**, not
contrast it. Use `world` and the match is automatic; a named gradient on a section heading is the
exception and must still sit in that world's hue range. `aurora`, `lavender`, `neon` and `candy`
have no section job — MDX `<Mark>` only.

`<Mark>` is body-size text, so it carries `body-accent`: each stop is mixed 20% toward black in light
mode (`globals.css`), which puts every named gradient at 4.5:1 or more (measured in the browser:
lowest stop 4.6:1). Dark mode uses the stops unmixed.

**Measured contrast of gradient text.** The lowest stop decides. Display type counts as large
text, so the bar is 3:1. Light mode on `#FAFAFA`; every dark variant clears 4.7:1 on `#121212`.

| Gradient | Lowest light stop | Result |
|---|---|---|
| `brand` / blue world | 5.36 | passes |
| cyan world | 5.02 | passes |
| `iris` | 5.00 | passes |
| violet world | 4.67 | passes |
| `neon` | 3.99 | passes (large text only) |
| `lavender` | 3.91 | passes (large text only) |
| `ocean` | 3.41 | passes (large text only) |
| `forest` / green world, `aurora` | 3.21 | passes (large text only) |
| `candy` | 3.06 | passes (large text only) |
| `ember` / orange world | 3.15 | passes (large text only) — amber stop darkened from `36 94% 46%` (2.51) on 2026-10-02 |
| `mint` | 3.24 | passes (large text only) — teal stops darkened from 38% (2.94) on 2026-10-02 |
| `sunset` | 3.21 | passes (large text only) — orange stop darkened from `30 94% 48%` (2.71) on 2026-10-02 |

Every gradient now clears the large-text bar in both modes. None of them is safe at body size.

**Rarity budget (amended after the 2026 audit):** the old "~2 per page" was never the built
reality (the homepage shipped 7). The enforceable rule: **≤1 gradient accent per section ·
every accent world-matched · never the same gradient on two adjacent sections · the hero and
the closing CTA are the anchor accents — a section between them earns color only if it is a
value/conversion claim (otherwise `<Highlight>`).** On social, that still means **one gradient
phrase per graphic, max** — it's a spotlight, not a theme.

### 3.5 Semantic colors
| Token | Light | Dark | Use |
|---|---|---|---|
| `--success` | `162 95% 31%` | `162 60% 50%` | Confirmation, "in production" dots |
| `--warning` | `38 96% 40%` | `36 84% 60%` | Caution |
| `--danger` (`error` and `destructive` are names for it) | `0 65% 51%` | `0 74% 68%` | Errors, destructive actions |
| `--messaging-whatsapp` | `142 70% 28%` | `142 70% 49%` | WhatsApp green; defined, not used by any component today |

Measured against the page background: danger 4.72:1 light / 6.33:1 dark, and WhatsApp 5.22:1 /
9.58:1, are safe as text. **Success (3.43:1) and warning (3.07:1) are not text colours in light
mode** — they clear only the 3:1 bar for icons and marks, which is how the site uses them (check
icons, callout icons). In dark both are above 9:1.

### 3.6 Tech-stack accent colors — removed
The Tech-DNA section and its `--tech-accent-*` tokens no longer exist.

### 3.7 Surface / elevation tokens (`--s-*`)
A parallel opacity-based scale for layering UI on either background. The alphas differ by scene:

| Token | Light / dark | Inverted island | Inverted header |
|---|---|---|---|
| `--s-high` | 90% | 92% | 92% |
| `--s-mid` | 72% | 55% | 60% |
| `--s-low` | 52% | 35% | 40% |
| `--s-muted` | 40% | 22% | 26% |
| `--s-surface` | 4% (5% dark) | 4% | 5% |
| `--s-border` | 10% | 8% | 10% |

Measured as text: `s-high` and `s-mid` clear AA everywhere (lowest: 6.11:1). `s-low` is 3.79:1 in
light, 5.10:1 in dark, 3.23:1 on an inverted island — large text or non-essential labels only.
`s-muted` is 2.63:1 / 3.50:1 / 2.02:1 — decoration, never something a person has to read.

### 3.8 Text selection & misc
- **Selection highlight:** brand blue at 14% opacity (`::selection`).
- **Inverted scenes** (`data-scene="inverted"`): dark islands inside light pages (and vice-versa) —
  used for final CTAs and audit panels. They flip the full token set so contrast holds.
- There is no page-top glow in dark mode.

### 3.9 Color usage — when to use each color (by case)

This is the decision layer: given *what* you're coloring, *which* token to reach for. Frequencies in
parentheses are how often each appears in the live `components/` + `app/` (a signal of "default" vs
"rare"). **Rule of thumb: 90% of every screen is greyscale; color is an event, not a surface.**

**Text — pick by the role of the words, not by taste:**
| You are coloring… | Use | Condition / why |
|---|---|---|
| Primary copy, headings, ink | `text-foreground` | Default for all reading text. Auto-flips in dark mode. |
| Secondary / supporting copy, captions | `text-muted-foreground` | Anything subordinate to the main line. |
| The dismissed half of an "X — not Y" line | `text-foreground/60` (the `<Dim>` primitive) | **Only** for the rejected alternative. Never for normal de-emphasis. 4.94:1 light, 6.42:1 dark. |
| A section heading's craft/restraint clause | `text-foreground/45` (via `<Highlight>`) | Set automatically by `SectionHeading` when no `accent`. 3.04:1 light, 4.11:1 dark — legal only because it is display-size type; never use /45 on body text. |
| Brand blue **as literal text** | `text-brand-text` (18×) | Use **only** when you need the brand blue on text *outside* a color-world context (e.g. an inline link in prose, a standalone brand mention). AA-safe both modes. |
| A section's accent text (eyebrow tone, accent mark, active state) | `text-local-accent-text` (the workhorse) | The **default way to put color on text.** Tracks the section's world via `--local-accent-text` — a text-safe channel that equals the fill except where the fill isn't AA-readable (root + blue-world dark). Never use bare `text-local-accent` for text — that's the fill token. |
| Layered text on an unknown/tinted surface | `text-s-high / -mid / -low / -muted` | Inside inverted islands and on tinted surfaces. Only `-high` and `-mid` are AA for body text (§3.7). |

**Backgrounds, surfaces, borders:**
| Case | Use | Condition |
|---|---|---|
| Page background | `bg-background` | `#FAFAFA` light / `#121212` dark. Pick one mode, commit. |
| A card / raised panel | `bg-card` (white / `#171717`) or `bg-surface` | `bg-card` for floating cards; `bg-surface` for subtle inset tint. |
| Hairline divider / cell / card border | `border-border-subtle` (10% ink, scene-aware) | **The** hairline for containers, separators and grids (§6.1.4). `border-t border-border-subtle` between sections. |
| A stronger border (emphasis, active cell) | `border-border-mid` (18% ink; 14% white in dark) | Decorative only: it measures 1.5:1, so it is never a control's only edge — use `border-foreground/45` or stronger there. The hairline is 1.2:1. |
| Section identity tint | `accent-world-{blue\|orange\|green\|violet\|cyan}` on the `<section>` | One per section. Everything inside reads `--local-accent`. |

**Brand blue (`--brand`, `#0D6CE7`) — fills, not text:**
| Case | Use | Condition |
|---|---|---|
| Focus ring on any control | `ring-brand` / the focus-visible outline | Always. Non-negotiable accessibility default. |
| A literal "brand-blue" button | `bg-brand` (10×) + `bg-brand-hover` on hover | Use sparingly. **One sanctioned primary-CTA exception: the homepage hero** ("Request a Scope") — the single brand-fill moment of the page. The nav CTA (desktop bar and mobile drawer) is also brand blue (Ali, 2026-09-17). Every other primary CTA is ink. |
| Selection highlight | `--selection-accent` at 14% | Automatic; don't override. |
| ⚠️ Don't | brand blue as body text | Brand blue is a fill/focus color, not a text color (use `text-brand-text` for that). |

**Local-accent (the section's color world) — the primary "colorful" channel:**
| Case | Use | Condition |
|---|---|---|
| The closing/conversion CTA inside a section | `bg-local-accent text-local-accent-fg` (38×) | In an **orange** world → an orange button; in green → green. The button inherits the world. |
| Eyebrow accent, small accent mark | `text-local-accent-text` | Default colored-text move (see above). |
| Active dot, rule, fill | `bg-local-accent` | The fill token. |
| Soft accent wash behind a focal element | `bg-local-accent-soft` (~8% tint) | Subtle background emphasis, world-matched. |

**Worlds — choose by the section's *job* (from §3.3):**
- **Blue** → brand, architecture, trust, transparency, hero. The default; use when in doubt.
- **Orange (27°)** → action: services, pricing, lead capture, every closing CTA.
- **Green (158°)** → proof: shipped work, "in production," the pipeline.
- **Violet** → interface design; **cyan** → consulting. `/services` only.
- *One world per section. Never mix two worlds in one asset.*

**Gradients (`<Accent>`, display-only) — headline color, must match the world:**
- Use `gradient="world"`; it resolves to `brand` stops in blue, `ember` in orange, `forest` in green (§3.4).
- **Conditions:** headline/value-prop text only — never body. Budget as in §3.4 (≤1 per section, world-matched). One gradient phrase per social graphic, max.

**Semantic colors — state signals, never decoration:**
| Color | Use **only** when… | Real usage |
|---|---|---|
| `--success` (`162 95% 31%`) | confirming success / marking "in production" status dots | `bg-success` (1×), `text-success` (4×, icons only) |
| `--warning` (`38 96% 40%`) | cautioning the user (non-blocking) | rare |
| `--error` / `--destructive` (`0 65% 51%`) | a real error or a destructive action — incl. **form validation** (`aria-invalid`) | `text-destructive` (10×), `border-destructive` (8×) — mostly forms (§7.4) |
| `--messaging-whatsapp` | a WhatsApp contact affordance specifically | unused today |

> Semantic colors are **off-limits for emphasis or branding.** Green means "succeeded," not "nice."
> If you want approving color, use the green *world*, not `--success`.

**Glow:** there is no glow token. Elevation is `--shadow-card` / `--shadow-card-lg` only (§6.3).

**The one-line decision tree:**
> Reading text → `foreground`/`muted-foreground`. Need *one* spot of color → `text-local-accent-text`
> (it's already the right world). A button that must pop → `bg-local-accent` in an orange section.
> Reporting state → semantic (`success`/`destructive`). Everything else stays greyscale.

---

## 4. Typography

One typeface: **Altruvex Sans** (`packages/brand-font`), in `apps/www` and `apps/admin` alike
(Ali, 2026-10-01/02). It sets headings, body text, eyebrows, labels, figures, emphasis and code, in
English and Arabic. There is no second web font, no serif, no italic and no monospace. It is loaded
with `next/font/local` from two variable files, one per script.

| File | Variable | Covers |
|---|---|---|
| `AltruvexSansLatin-VF.woff2` | `--font-brand-latin` | Latin text, weights 100–900 |
| `AltruvexSansArabic-VF.woff2` | `--font-brand-arabic` | Arabic text, weights 100–900 |

`--font-brand` stacks the two per locale (the page's own script first), followed by the package's
measured fallback faces (`@repo/brand-font/fallback.css`). `--font-sans`, `--font-body` and
`--font-mono` all resolve to `--font-brand`, so the three Tailwind font classes differ in name only.

### 4.1 Type scale (clamped, responsive)
Base styles in `apps/www/app/globals.css`. Tracking comes from the font package's measured tokens
(`@repo/brand-font/tokens.css`, `--track-<size>-<weight>`), not from hand-typed values.

| Level | Size (clamp) | Weight | Tracking | Leading |
|---|---|---|---|---|
| `h1` | `clamp(3rem, 5vw, 4.5rem)` | 700 | `--track-72-700` (-0.029em) | 1.02 |
| `h2` | `clamp(2.125rem, 4vw, 3.25rem)` | 600 | `--track-32-600` (-0.019em) | 1.08 |
| `.section-title` | `clamp(28px, 4.5vw, 52px)` | inherits; `SectionHeading` sets 400 | `--track-32-600` (-0.019em) | 1.08 |
| `h3` | `clamp(1.5rem, 2.4vw, 2rem)` | 600 | `--track-32-600` (-0.019em) | 1.15 |
| `h4` | `clamp(1.25rem, 1.8vw, 1.5rem)` | 500 | `--track-24-500` (-0.015em) | 1.2 |
| Body | `--text-body-base` = `clamp(17px, 1.05vw, 18px)` | 400 | normal | `--leading-body` = **1.75** |
| `.eyebrow` | `0.875rem` | inherits (400) | **0.2em**, UPPERCASE | 1.5 |

There is no `.display`, `.label` or `.caption` class; smaller text is set with Tailwind size classes.

**Headline character:** large and tight (negative tracking). The base element styles are heavy
(600–700), but the sections mostly override them: section titles are regular (400, via
`SectionHeading`), and display lines in the sections are usually light (`font-light`) or medium.
Body is generously leaded (1.75) for calm readability.

**Measure (line length, T6):** there are no measure tokens in the code; line length is set per
component with `max-w-*` classes.

**Two documented deviations from the law layer (adjudicated, deliberate):**
- Body leading is **1.75** EN / **1.9** AR — above T5's 1.5–1.6 band. Kept: short marketing
  paragraphs + generous whitespace are the premium voice; not a long-form reading surface.
- Display leading runs **1.02–1.08** — below T5's 1.1 floor. Kept: Latin display convention at
  48–72px; Arabic headings are held at `--lh-heading-ar` (1.3) and never inherit the Latin leading.

### 4.2 The Eyebrow (signature element)
The **uppercase, wide-tracked kicker** above section titles is a core brand signal — it
reads as "engineering / spec sheet." Often numbered: `02 — What We Build`, `03 — Delivery Model`,
`07 — Let's Build`. **Always include an eyebrow on a branded graphic** — it's the cheapest way to make
something instantly look like Altruvex.

### 4.3 RTL / Arabic
- Arabic uses **Altruvex Sans Arabic** for everything; letter-spacing is forced to `0` (Latin tracking breaks Arabic).
- Eyebrows in Arabic drop the uppercase transform and the wide tracking.
- `<Highlight>` is **bold** in Arabic instead of light (`rtl:font-bold`).
- A light (300) heading is set at `--weight-ar-display-light` (310) in Arabic, to match the Latin stroke.
- Arabic headings use `--lh-heading-ar` (1.3), whatever leading the component sets.
- Body line-height is looser in Arabic (1.9).

---

## 5. The Emphasis System (the brand's typographic signature)

This is the most distinctive part of Altruvex's design language. Headlines and body copy are split
into a base clause + an **emphasized clause**, using four primitives (`components/ui/emphasis.tsx`).
**Pick the primitive per phrase, by meaning:**

| Primitive | Looks like | Used for | Example |
|---|---|---|---|
| **`<Highlight>`** | dimmed, **light weight**, upright (never italic) | restraint / craft / precision / trust / *loss-framed* lines | *"every time."* · *"the project."* · *"should not be a gamble."* |
| **`<Accent>`** | **gradient color** (world-matched) | commercial outcomes / value props / conversion phrases | *"a direct technical conversation."* · *"revenue"* |
| **`<Strong>`** | semibold, full-ink | the core claim inside body copy | *"full source code ownership"* |
| **`<Dim>`** | foreground at 60% | the dismissed half of an "X — not Y" contrast | *"not templates with a brand coat."* |

**Decision rule:** *calm/precision/quality/risk → Highlight (light, dimmed).* *Bold/value/conversion →
Accent (gradient).* Loss- or risk-framed phrases stay Highlight even if they're conversion-y —
coloring a warning is tonally wrong (e.g. *"a gamble."* / *"compounds in cost."* stay Highlight).

**Body-copy doctrine:** ≤1 emphasis idea per paragraph. `<Strong>` on the core claim, `<Dim>` on the
rejected alternative. Never put color or the Highlight treatment in body — those are headline-only treatments.

> **For social:** this two-tone headline (plain text + one emphasized clause) is *the* layout to
> reuse. Set the headline in Altruvex Sans, then render the final clause either in **light grey**
> (Highlight) or in **one world-matched gradient** (Accent). One emphasis per graphic.

---

## 6. Spacing, Radius, Elevation, Texture

### 6.1 Edges — radius and borders (base `--radius: 1rem` = 16px)

The edge system was unified on 2026-09-19 (the full record, including every decision, is in
`docs/edge-system-2026-09.md`). Every border and radius in `apps/www` traces back either to a
token below or to a named exception in §6.1.5.

#### 6.1.1 Two radius families, never mixed

| family | tokens | value | keyed to | what belongs here |
|---|---|---|---|---|
| **control** | `ctl-xs` `ctl-sm` `ctl` `ctl-lg` `ctl-xl` | 4 / 12 / 16 / 18 / 20 | **height** | buttons, inputs, chips, keys, segmented controls, focus shapes |
| **panel** | `panel-sm` `panel-md` `panel-lg` | 22 / 28 / 34 | **role** | cards, overlays/popovers, large blocks and tiles |

**Control radius tracks control HEIGHT, not importance**, so pick the token by the measured height:
`rounded-ctl-xs` (≤24px: keys, inline code, small tags, glyphs) · `rounded-ctl-sm` (~32px) ·
`rounded-ctl` (36–40px) · `rounded-ctl-lg` (44px) · `rounded-ctl-xl` (48px and up). 20px is the
ceiling, because half of a 40px control is 20px, so anything at or above half the height is a
capsule. That is the rule as written; the live `MagneticButton` and `Button`
do not follow it — every size is `rounded-full` (§7.1, open conflict).

**Panel radius tracks ROLE, not size or importance**: card → `panel-sm`, overlay/popover →
`panel-md`, large block or tile → `panel-lg`. A lead-capture card is still a card. Visual weight
comes from shadow, colour or physical size, never from a bigger corner.

Never cross the families: a panel radius on a 40px button **is** a pill, and a control radius on
a card reads machined. The legacy steps (`rounded-sm/md/lg/xl/2xl`) are still defined only because
the recorded exceptions use them. **New code never uses them.**

#### 6.1.2 The concentric rule, and when it binds

`inner = outer − padding`, but **only when the child sits in the parent's corner and the padding is
smaller than the outer radius.** When padding ≥ outer radius, the two curves are too far apart to
read as nested, and the child takes its own role's token. In practice, only padding under ~20px on
a panel binds. The one inset that occurs has its own token, `--radius-panel-inset` =
`panel-sm − 1rem` = **6px** (a panel-sm padded 16px).

When the concentric value and the height key disagree, **change the padding or position, not the
radius**. Examples:
- the command palette: `panel-md` 28 − `p-3` 12 = 16 = `ctl` for its 40px rows;
- the code-block copy button: `panel-sm` 22 − `top-2.5` 10 = 12 = `ctl-sm`;
- a segmented control: segment `ctl-sm` 12 + `p-1` 4 = 16 = `ctl` for the well.

`panel-md` was derived exactly this way (8px list padding + a 20px row = 28). `panel-sm` is one 6px
step below it and leaves a visible 6px inset at the dominant card padding. `panel-lg` is the same
step up; nothing in the code constrains it, so a `panel-lg` block may host corner children only at
padding ≤ 24px.

#### 6.1.3 Three edge roles

| role | what | edge | radius |
|---|---|---|---|
| **A · Container** | cards, panels, overlays, popovers, media frames | 4-side 1px `border-border-subtle`, or no border on glass or media | `panel-*` |
| **B · Separator** | list and table rows, section dividers, underline inputs, drawn `h-px` rules | one side only, 1px `border-border-subtle` / `divide-border-subtle` / `bg-border-subtle` | **never** |
| **C · Grid** | tabular or grid data only: the estimator grids, transparency grids, ownership stack, maintenance table | outer 1px `border-border-subtle` + a panel radius; internal 1px lines (`gap-px` over `bg-border-subtle`, or row `border-b`) | outer: `panel-*`; cells: **0** |

Pick one containment per section. Never wrap separated rows in a bordered box **and** border each
row; that composite belongs to role C alone, and only for tabular data.

#### 6.1.4 One hairline

`--border-subtle` (`border-border-subtle`) is **the** hairline for all three roles. It is an alias
of `--s-border`, declared **beside every `--s-border` definition** (root, dark, and each inverted
scene), so it follows every Chromatic Intent scene flip. A single `:root` alias would not follow the
flips: a custom property resolves where it is declared, and descendants inherit the resolved value.
Nothing thicker than 1px except the named exceptions and interactive, error or focus states.
`border-border-mid` remains for a deliberately stronger edge and for hover.

#### 6.1.5 Named exceptions (closed lists; valid only where stated)

| exception | valid only for | edge |
|---|---|---|
| **ledger-head-rule** | the top rule that opens a ledger or register data block | `border-t-2 border-foreground`. Never thinned, never used as generic emphasis (standards' card-top rule was refused it and is language B) |
| **accent-side-rule** | pull quotes, blockquotes, annotated notes | `border-s-2` + accent or ink colour. Logical side only, never `border-l`/`border-r` |
| **status-edge** | semantic status cards: error, warning, success, info (alerts, callouts) | tinted 1px `border-{status}/…` |
| **pill** | badges, tags, status chips, dots, toggles, circular icon buttons | `rounded-full`, a true capsule (see the squircle note) |
| **focus-shape** | a radius that exists only so a focus ring has corners | `rounded-ctl-sm` |
| **diagram / glyph** | drawn marks: nodes, pass markers, connectors, legend swatches, icon glyphs, illustrated UI mocks | may use 2px and dashed strokes; radius from `ctl-xs`, or scaled with the glyph |
| **logo tile** | the brand mark | its corner scales with the mark |

The full exception record, with every location and its reason, is in `docs/edge-system-2026-09.md`.

#### 6.1.6 Squircle

Continuous corners come from `@supports (corner-shape: squircle)` at the end of
`apps/www/app/globals.css`, **applied to rounded-rects only**. `.rounded-full` is explicitly reset to
`corner-shape: round`: a squircle at capsule radius renders a rounded *square*, not a circle, which
silently boxed every dot, badge, avatar and the custom cursor. Never widen that rule to an attribute
selector: `[class*="rounded-full"]` would catch `after:rounded-full` and friends.

The rule once vanished in an unrelated commit with nothing failing. After touching `globals.css`,
check it in the browser: computed `corner-shape` must read `superellipse(2)` on a rounded-rect and
`superellipse(1)` on `rounded-full`.

`--radius-surface`, `--radius-overlay` and `--radius-section` are kept as aliases of
`panel-sm/md/lg`.

**The radius decision (CI8 — Ali, 2026-07-27, reference: macOS/iOS widgets):** both the "12px
machined" call and the 14px/**pill** pass are retired. The reference Ali set is the *widget*
corner, so panels are generous and controls stay controls:
- **Panels → 22 / 28 / 34px** — cards 22, modals and sheets 28, large sections and tiles 34.
- **Buttons → rounded-rect 12–20px, scaled to height** via the `ctl-*` tokens. **Pill is not a
  button shape** here, but a big CTA still gets a big corner (48px tall → 20px).
- **Pill (`rounded-full`) is reserved** for badges, mono tags, status chips, dots, toggles, and
  circular icon buttons — never for a CTA. And pill means a *true* capsule: see the
  `corner-shape: round` reset above.

CI8 is a `judgment`-class rule, so the owner's call governs. Nested elements still follow
`inner = outer − padding`.

### 6.2 Section rhythm
Vertical section padding: `--section-y-top: clamp(5rem, 10vh, 8rem)` and
`--section-y-bottom: clamp(5rem, 14vh, 10rem)`. **Generous whitespace is part of the premium feel** —
sections breathe; don't crowd social layouts either.

### 6.3 Elevation (shadows)
| Token | Level | Use |
|---|---|---|
| — | 0 | Flat: `border-border-subtle` edge only (edges define depth first — CI9) |
| `--shadow-card` | 1 | Default card lift (very subtle) |
| `--shadow-card-lg` | 2 | Hover / featured card |

Both levels are a **two-layer shadow**: a tight contact layer whose opacity drops as elevation
rises (0.04 → 0.03 in light mode) and a soft key layer that grows with height. There is no overlay
shadow and no glow token; `--elev-1` / `--elev-2` in `packages/ui/src/styles/tokens.css` are the
admin app's pair. Shadows are **soft and low** in light mode, deeper in dark; the aesthetic is
flat-with-a-whisper, not heavy material drop-shadows.

### 6.4 Glass
- **Liquid glass** (`packages/ui/src/styles/liquid-glass.css`): `.liquid-glass`,
  `.liquid-glass-panel`, `.liquid-glass-flat`, `.liquid-glass-nav`, `.liquid-glass-toolbar` —
  frosted, blurred, saturated panels for nav and overlays. Light gradient + backdrop-blur + inset
  highlight. Degrades gracefully when the user prefers reduced transparency.
- There is no film-grain overlay; large flat areas stay flat.

---

## 7. Components (visual language)

### 7.1 Buttons

Two components. `Button` (`packages/ui/src/components/primitives/button.tsx`) is the shared
primitive; `MagneticButton` (`apps/www/components/magnetic-button.tsx`) is the site's CTA.

| `Button` variant | Look |
|---|---|
| `default` | Ink fill (primary), white text — the standard CTA |
| `brand` | Brand-blue fill, white text |
| `glass` | `liquid-glass-flat` surface |
| `outline` | Bordered — secondary; hover tints the surface with `muted` |
| `secondary` | `secondary` fill |
| `ghost` | No border, `muted` hover tint |
| `link` | Underline on hover |
| `destructive` | Solid red — only the final commit inside a confirmation dialog |
| `destructive-ghost` | Red text, quiet until hovered — the trigger of a destructive flow |

`Button` sizes: `sm` 32px · `default` 40px · `lg` 44px · `xl` 48px · icons 32–40px. On **coarse
pointers (touch)** every size grows to the 44px minimum via `pointer-coarse:` variants (CI1) — the
compact sizes are a fine-pointer-only spec. `font-medium`, `active:scale-[0.98]`, 200ms
transitions, built-in `loading` spinner state.

`MagneticButton` sizes: `sm` 40px · `default` 44 → 48px · `lg` 48 → 56px. Its press is the
`usePress` spring (scale 0.95), its transition is `--motion-drawer` (300ms), and its busy prop is
`isLoading`.

**Radius: every size of both components is `rounded-full` — a pill.** This is what ships, and it
disagrees with the edge system (`docs/edge-system-2026-09.md`), which keys control radius to
measured height through the `ctl-*` tokens and reserves the pill for badges, tags, dots and
toggles. The conflict is open; do not copy either side into new work without Ali's ruling.

**Note:** the nav CTA is brand blue — `MagneticButton variant="primary"` in the desktop bar and the
mobile drawer (Ali, 2026-09-17). Keep other primary CTAs confident and restrained.

### 7.2 Cards
White (`#FFFFFF`) on light / `#171717` on dark, `rounded-panel-sm` (22px),
`border border-border-subtle`, `--shadow-card`. Tabular and grid data uses role C (§6.1.3): one
bordered outer box with 1px internal lines, rather than floating cards (alignment over decoration).

### 7.3 Focus & accessibility (non-negotiable, it's a brand value)
- Visible focus ring on everything (`focus-visible: 2px brand outline, offset`).
- Contrast: AA floor (4.5:1) on accent surfaces; body copy aims higher. Measured values: §3.
- WCAG 2.1 AA is a *build requirement*: *"If it is not accessible, it is not finished."*
- Honor `prefers-reduced-motion` and `prefers-reduced-transparency` — both have CSS fallbacks.

### 7.4 Form inputs (`packages/ui/src/www/input.tsx`)

The form language is **underline, not box** — this is a deliberate, recognizable choice. Inputs have
no border except a single hairline on the bottom edge; they sit flush with no horizontal padding, so
a form reads as a stack of typographic lines rather than a grid of boxes.

`input.tsx` exports three controls that **share one base** (`formControlClasses`):

| Export | Element | Notes |
|---|---|---|
| `Input` | `<input>` | + file-input styling (`file:h-7`, transparent, no border) |
| `Textarea` | `<textarea>` | adds `resize-none py-3 leading-relaxed` |
| `SelectField` | `<select>` | same underline; wrapped in a `<span>`, `appearance-none pe-8`, with a `ChevronDown` |

The shared base (verbatim intent):
```
w-full min-w-0 min-h-11 rounded-none bg-transparent px-0 py-2.5 text-base text-foreground   // flush, square, 44px min target
placeholder:text-muted-foreground
border-b border-foreground/55 outline-none                        // the only border — bottom line
transition-[color,border-color,box-shadow] duration-(--duration-instant) ease-(--ease-default)
enabled:hover:border-foreground/80
focus-visible:border-ring focus-visible:shadow-[inset_0_-1px_0_0_var(--color-ring)]
aria-invalid:border-destructive  (+ the same inset line in destructive on focus)
disabled:cursor-not-allowed disabled:border-dashed disabled:border-foreground/30 disabled:text-muted-foreground
```

**States:**
- **Default** — bottom line `border-foreground/55`, transparent fill, muted placeholder.
- **Hover** — the line darkens to `border-foreground/80`.
- **Focus** — the line becomes `ring` (brand) and thickens by a 1px inset shadow. There is no
  outline: the thicker line is the focus indicator.
- **Invalid** (`aria-invalid`) — line and inset shadow flip to `destructive`.
- **Disabled** — a dashed line at `foreground/30` and muted text. The text is not faded with
  opacity, because someone may still need to read it.

Transitions run at `--duration-instant` (120ms) — inputs respond **immediately**, no easing-in lag.

**Related form components** in `packages/ui/src/www/`: `label.tsx`, `select.tsx`, `accordion.tsx`,
`drawer.tsx`, `calendar.tsx`, `date-picker.tsx`. `popover.tsx` is in
`packages/ui/src/components/overlays/`. There is no scroll-area and no time picker.

**Social/brand note:** when mocking a form in a graphic, draw inputs as **underlines, never as
rounded boxes** — the box style reads as generic SaaS and breaks the brand.

### 7.5 Iconography

**Icon set:** [Lucide](https://lucide.dev) (`lucide-react`) exclusively — no other icon library appears
anywhere in the codebase. Lucide's style is the brand's icon style: **thin-stroke, geometric, no fill,
no duotone.** It pairs with Altruvex Sans (geometric/technical) and the
"engineering, not decoration" voice (§1) — icons read as functional markers, not illustration.

- **Default stroke/size:** rendered at its default `strokeWidth` (2) and small UI sizes (`h-4 w-4` /
  `h-5 w-5`); a few icons set 1.5, 2.5 or 3 where the size calls for it. Icons are never blown up
  into a graphic centerpiece.
- **Color:** icons inherit text-token color (`text-foreground`, `text-muted-foreground`, or the
  semantic/local-accent tokens from §3.9 when they signal state) — never a raw hex, same rule as everything else.
- **Role:** strictly functional — nav, form affordances (calendar, phone, mail), state (check, alert,
  loading spinner), callout markers (§7.5→7.6 below). **Never decorative** filler in a layout.
- **Social rule:** if a social graphic needs an icon (e.g. a checklist, a stat callout), pull from
  Lucide at the same thin-stroke weight — don't introduce a rounder/filled icon set, it will clash
  with the rest of the brand's geometric language.

### 7.6 Imagery & photography direction

The live product uses **brand-mood photography in a few fixed places** — the homepage hero stage
(`hero-section.server.tsx`, a `next/image` photo) and the `/work` stages — and no illustration.
Everything else is built from type, color tokens, hairlines and shadows. The photos set a mood;
they are not product shots, and a new one is shortlisted and approved by Ali before it ships.

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
| `Quote` | `quote.tsx` | `border-local-accent` side rule (2px) + blockquote text wrapped in `<Highlight>` (light, dimmed, §5) — quotes are a craft/restraint moment, not a conversion one. Attribution is `font-mono` `<Strong>{author}</Strong>`, role in `text-muted-foreground`. |
| `Mark` | `mdx-components.tsx` | A thin wrapper over `<Accent gradient="…">` for use **inside MDX prose** — the article's "one defining claim," not a highlighter. Used at most once or twice per article (e.g. `<Mark gradient="ember">-2,400%</Mark>` for an ROI stat). Same ≤2-per-page, world-matched budget as `<Accent>` (§3.4/§5). |

MDX's default `strong`/`em` markdown elements are remapped to the brand primitives, not left as raw
`<b>`/`<i>` — so writing plain `**bold**`/`*italic*` in an `.mdx` file already gets brand treatment for
free: `strong` → `<Strong>` (semibold core claim), `em` → `<Highlight>` (light, dimmed, upright; craft/restraint).

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
- **Durations** (`apps/www/lib/motion/tokens.ts`): `--duration-instant: 120ms`; UI transitions ~200ms; drawer 0.3s; small reveals 0.4s; standard reveal 0.7s; text 0.9s; section headings 1.1s; a large media block settling 1.4s.
- **Anticipation (M2):** meaningful reveals (`useSectionElement` — CTAs, featured blocks) lead
  with a micro-beat: ~8% counter-drift away from rest at partial opacity for ~18% of the
  duration, then the main ease-out settle. Opt out per-element with `anticipate: false`;
  word-split headline reveals deliberately skip it (per-word wind-up reads as jitter).
- **Character:** motion is *purposeful and quick* — reveals, not decoration. Under
  reduced motion a reveal becomes a 0.18s opacity crossfade and a press dims the control
  (opacity 0.7) instead of scaling it.

For video/social motion, mirror this: text rises and settles with a tight ease, one element at a
time, fast. No bouncing, no spinning, no gratuitous loops.

---

## 9. Translating This to Social Media

A repeatable recipe so every post is unmistakably Altruvex:

**Layout skeleton**
1. **Eyebrow** — Altruvex Sans, UPPERCASE, wide tracking, optionally numbered (`03 — STANDARDS`). Muted grey or world-accent.
2. **Headline** — Altruvex Sans, big, tight, heavy. Two clauses: plain + one emphasized clause.
3. **Emphasis** — the final clause is either **light grey** (Highlight, for craft/restraint)
   or **one world-matched gradient** (Accent, for value/conversion). Never both.
4. **Body / supporting line** — Altruvex Sans, calm, with a single `<Strong>` claim and a `<Dim>` "…not Y."
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
- No grain: flat backgrounds stay flat. Keep shadows soft and low. Generous margins.

**The litmus test:** *Could a competitor swap their logo onto this post and have it still work?*
If yes, it's too generic — sharpen the claim, name the alternative you reject, tighten the type.

### 9.1 Arabic stock lines (pulled verbatim from `messages/ar/*.json`)

> [2026-09-27] Only the third line is still on the site (`messages/ar/transparency.json`); the
> first two, and all three English anchors, are no longer in the copy. Re-pick before reusing.

§1's stock lines are English-only; for Arabic posts, use the site's own shipped translations rather
than re-translating from scratch (Arabic copy here is RTL-native, not a mirrored translation — see §4.3):

| English anchor | Arabic (verbatim from the site) |
|---|---|
| "Build the system your revenue depends on." | "ابنِ النظام الذي يعتمد عليه نمو إيراداتك." |
| "Architecture first. Performance by default." | "التخطيط أولاً. الأداء يتبعه بعد ذلك." |
| "Clear engineering." | "تطوير واضح." |

When writing a *new* Arabic line that isn't in `messages/ar/` yet, match this register: direct,
unhedged, no exclamation marks, same "X — not Y" contrast idiom translated naturally (not word-for-word)
— and set it in **Altruvex Sans Arabic** (§4.3), with letter-spacing at `0`.

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
// Two variable files, one per script; every weight from 100 to 900 renders true.
const brandLatin = localFont({
  src: "../../node_modules/@repo/brand-font/dist/web/AltruvexSansLatin-VF.woff2",
  weight: "100 900", variable: "--font-brand-latin",
  display: "optional", adjustFontFallback: false, preload: true,
});
const brandArabic = localFont({
  src: "../../node_modules/@repo/brand-font/dist/web/AltruvexSansArabic-VF.woff2",
  weight: "100 900", variable: "--font-brand-arabic",
  display: "optional", adjustFontFallback: false, preload: true,
});

// Both variables sit on <html>; globals.css orders them per locale into --font-brand.
<html dir={locale === "ar" ? "rtl" : "ltr"} className={cn(brandLatin.variable, brandArabic.variable)}>
```

The `globals.css` `@theme` block maps them so you use them as **Tailwind classes**, never raw CSS:

| Want | Class | Resolves to |
|---|---|---|
| Heading font | `font-sans` | Altruvex Sans |
| Body font | `font-body` | Altruvex Sans |
| Eyebrow / label | `font-mono` | Altruvex Sans (the class name is historical; nothing is monospaced) |

**You almost never set the font by hand** — everything already inherits Altruvex Sans from the base
styles in `globals.css`. `font-serif` no longer exists. To build a headline, just write an `<h1>`/`<h2>` and it inherits the right font, size,
weight, and tracking automatically.

### 10.2 How the COLORS are applied (in JSX)

**Never hardcode a hex in a component.** Every color is a token exposed as a Tailwind utility. Usage:

```tsx
// Text colors
text-foreground          // primary ink (auto-flips in dark mode)
text-muted-foreground    // secondary / supporting copy
text-foreground/60       // ad-hoc dimming (the <Dim> primitive = /60)
text-brand-text          // brand blue AS TEXT (AA-safe both modes)
text-local-accent        // the current section's color world (blue/orange/green/violet/cyan)

// Backgrounds & borders
bg-background  bg-card  bg-surface  bg-brand  bg-success/error/warning
border border-border-subtle // THE hairline (10% ink, scene-aware) — §6.1.4
border border-border-mid    // stronger edge / hover (18%)
rounded-panel-sm|md|lg      // card · overlay · large block (22/28/34) — by ROLE
rounded-ctl-xs|sm|—|lg|xl   // 4/12/16/18/20 — by measured HEIGHT

// Surface opacity scale (layering on any bg)
text-s-high  text-s-mid  text-s-low  text-s-muted   // 90/72/52/40% ink, theme-aware
```

**The Color-World pattern** — this is how a section gets its identity. Put a world class on the
`<section>` (or any wrapper); everything inside reading `local-accent` follows it:

```tsx
import { accentWorldClass } from "@/lib/config/accent-world";

<section className={accentWorldClass("orange")}>   {/* or "green" / "blue" / "violet" / "cyan" */}
  <Eyebrow tone="accent">Pricing</Eyebrow>          {/* now orange */}
  <Button className="bg-local-accent text-local-accent-fg">Get Estimate</Button>
</section>
```
Worlds: **blue = brand/architecture · orange = CTA/pricing · green = proof/shipped work.** One world
per section. `violet` and `cyan` exist as well. (The class names `accent-world-blue/-orange/-green/-violet/-cyan`
are defined in `globals.css` with light + dark variants; text reads `text-local-accent-text`.)

**The Gradient-Accent pattern** — colored value-prop text via the `<Accent>` primitive:
```tsx
<Accent gradient="ember">scope your build?</Accent>   // orange world → ember
<Accent gradient="world">revenue</Accent>             // follows the section's world (§3.4)
```
Match the gradient to the section's world. Headline-only. ≤1 per section, never the same gradient on two adjacent sections (§3.4).

### 10.3 The layout shell: `Container` + section rhythm

Every section follows the same outer skeleton: a full-bleed `<section>` for background/world, a
`Container` for the max-width gutter, then content.

```tsx
// Container = mx-auto, max-w-352 (~1408px), responsive px (6→8→12→16)
<section className="border-t border-border-subtle pt-(--section-y-top) pb-(--section-y-bottom)">
  <Container>
    {/* content */}
  </Container>
</section>
```
- **Vertical rhythm:** always `pt-(--section-y-top) pb-(--section-y-bottom)` (the clamp-based tokens).
- **Section dividers:** a top hairline `border-t border-border-subtle` is the standard separator.
- **Max width:** `Container` caps at `max-w-352`; content blocks often cap tighter (`max-w-5xl`,
  `max-w-[52ch]` for prose) — generous whitespace is intentional.

### 10.4 The canonical section header: `<SectionHeading>`

Don't hand-roll section titles — use `components/sections/section-heading.tsx`. It composes the
Eyebrow + heading (`<h2>` unless `titleAs` says otherwise) + optional emphasized second clause + side description, and wires the motion refs.

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
| `accent` | — | A `HeadingAccent` (`world`, `brand`, `ocean`, `iris`, `ember`, `sunset`, `forest`, `mint`) → second clause is an `<Accent>`. Omit → `<Highlight>`. |
| `accentDirection` | `"r"` | Gradient sweep direction passed to `<Accent>` (`r`, `br`, etc.). |
| `accentAnimate` | `false` | `true`, `"shimmer"` or `"sweep"` — animates the gradient. |
| `italicWorld` | `false` | Sets the `<Highlight>` clause in the section's world instead of dimmed ink (the name is historical; the clause is upright). |
| `titleAs` | `"h2"` | Heading level: `"h1"`, `"h2"` or `"h3"`. |
| `className` | — | Class on the outer wrapper. |
| `secondTitleBreak` | `true` | Forces the second clause onto its own line (`<br>` on md+); `false` keeps it inline with a space. |
| `theme` | `"default"` | `"surface"` swaps to the `s-*` token set for dark/inverted islands (eyebrow→`text-s-mid`, title→`text-s-high`). |
| `customEyebrow` | `false` | Render the `eyebrow` node as a raw `<div>` instead of wrapping it in `<Eyebrow>` (for composite kickers). |
| `classes` | — | Per-element class overrides: `{ container, titleWrapper, eyebrow, title, secondTitle, description }`. |

**Key rule:** passing `accent="<gradient>"` makes the second clause a **gradient Accent** (value/
conversion). Omitting `accent` makes it a **light, dimmed Highlight** (craft/restraint). That single
prop is the Highlight-vs-Accent decision from §5, encoded.

**Two details worth knowing** (they're easy to get wrong when hand-building a heading to match):
- The `<h2>` carries `section-title font-normal` — i.e. the **weight is overridden to 400**, lighter
  than the `.section-title` base in §4.1. Section headings are deliberately *lighter* than other H2s.
- The default (non-surface) Highlight clause is `text-foreground/45` (`rtl:text-muted-foreground`)
  — a **specific 45% ink**, not an ad-hoc grey. The layout is
  `flex-col items-start justify-between gap-8 lg:flex-row lg:items-end`: title block left,
  description as a narrow column (`max-w-[20rem]`) pinned to the bottom-right on large screens.

### 10.5 Hero patterns: `<PageHero>` and the per-page heroes

`PageHero` follows this structure (2026-09-18): bottom-anchored, start-aligned,
eyebrow → `<h1>` → one paragraph (`text-muted-foreground`, ≤ `max-w-2xl`), with load-time motion from
`hero-motion-wrappers.tsx` (`HeroHeadline`/`HeroReveal`). No status pill, no pulsing dot, no scroll
hint, no grid-line overlay — all removed as decoration (the scroll hint and dot were idle loops).
- **`PageHero`** (`components/sections/page-hero.tsx`) — simple pages. Props: `eyebrow`, `title`,
  `titleItalic` (rendered as `<Highlight>`), `description`, `minHeightClass` (default `lg:min-h-dvh`),
  and `children`, which render as a record under a 2px ink rule (legal pages: last updated).
- **Service pages** have no shared hero shell. Each owns its hero: `maintenance-hero`,
  `audit-hero`, `dev-studio`, `interface-lab`, and `services-hero-index` on `/services`.
- **The homepage hero** is `hero-section.server.tsx` + `hero-stage.tsx`: an inset stage carrying a
  brand-mood photo. That device belongs to the homepage only.

The `PageHero` `<h1>` is `font-sans font-light` at `clamp(3rem,4.5vw,4.5rem)`, tracking `-0.03em` (normal in
RTL), with the second clause on its own line as a `<Highlight>`.

### 10.6 Motion contract (GSAP, via hooks)

Sections animate by attaching **refs from `@/lib/motion`**. Reach for a hook first; where no hook
fits, direct GSAP is allowed as long as every duration, ease and distance comes from `MOTION`
(`apps/www/MOTION.md` is the record). Import the hook, attach its ref, and the element reveals on scroll (word-split for titles, fade-rise for the rest),
with reduced-motion handled automatically.

```tsx
import { useSectionEyebrow, useSectionTitle, useSectionDescription, useSectionCardGrid } from "@/lib/motion";

const eyebrowRef = useSectionEyebrow();
const titleRef   = useSectionTitle();        // splits into .m-word, staggers up + de-blurs
const bodyRef    = useSectionDescription();
const gridRef    = useSectionCardGrid({ selector: "[data-ledger-row]" }); // staggers children
```
| Hook | Animates | Default |
|---|---|---|
| `useSectionTitle` | headline, word-split | dur 1.1s, stagger 0.05, rise 40px, blur |
| `useSectionEyebrow` | kicker | delay 0 |
| `useSectionDescription` | supporting copy | delay 0.15s |
| `useSectionElement` | CTAs / misc blocks | rise 16px, delay 0.25s |
| `useSectionCardGrid` | a list/grid of children | stagger 0.08 |

Tokens live in `lib/motion/tokens.ts` (`MOTION.ease/duration/distance/stagger`; the section offsets
are `MOTION.section`: eyebrow 0, description 0.15, element 0.25).
Order of appearance is always **eyebrow → title → description → element**.

### 10.7 Cards and surfaces

The site has no card component. Connected grids (services/work/pricing) use **1px-gap bordered
cells** instead of floating cards — alignment beats decoration, and hover reveals a tint rather
than a lift. `packages/ui` ships `<Surface variant="default|subtle|elevated|glass|glass-flat|toolbar">`
(`components/primitives/surface.tsx`) for the admin app; `apps/www` does not use it.

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
      className="accent-world-blue border-t border-border-subtle pt-(--section-y-top) pb-(--section-y-bottom)"
    >
      <Container>
        <SectionHeading
          titleId="example-heading"
          eyebrowRef={eyebrowRef} titleRef={titleRef} descriptionRef={bodyRef}
          eyebrow={t("eyebrow")}
          firstTitle={t("title")}
          secondTitle={t("titleAccent")}
          accent="world"                        // gradient (value) — or omit for a light, dimmed Highlight
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
- **All copy comes from `messages/{en,ar}/<namespace>.json` via `useTranslations`** — never hardcode strings.
  Every key must exist in **both** locales. Split headlines into `title` + `titleAccent`/`titleItalic`.
- **All colors are tokens** (`text-foreground`, `bg-brand`, `text-local-accent`) — zero hex/rgb in components.
- **All fonts via Tailwind classes** — everything is Altruvex Sans; there is no serif, italic or monospace to reach for.
- **One color world per section**, matched gradient, ≤1 Accent per section, never the same gradient on adjacent sections.
- **Section wrapper** = `pt-(--section-y-top) pb-(--section-y-bottom)` + `Container` + (usually) `border-t border-border-subtle`.
- **Motion via `useSection*` refs** first; direct GSAP only with `MOTION` tokens, never literal durations or eases. Always provide `aria-labelledby`/`titleId`.
- **RTL is first-class:** use logical classes (`inset-s-*`, `ltr:`/`rtl:` only where needed), never assume LTR.
- **Accessibility is a build gate:** semantic headings, visible focus, AA contrast, respect reduced-motion.

### 10.10 Interaction & micro-motion hooks

§10.6 covers the **reveal** hooks (`useSection*`) — entrances on scroll. There is a second family of
**interaction** hooks in `@/lib/motion` for hover/press/pointer micro-motion. All are exported from
`lib/motion/index.ts` and return a `ref` you attach to the element.

| Hook | What it does | Key options (defaults) |
|---|---|---|
| `useMagnetic` | Element drifts toward the cursor while hovered (used by `magnetic-button.tsx`, at strength 0.15). | `strength 0.35`, `max 24` (px pull), `spring "magnetic"` |
| `usePress` | Tactile scale-down on press, springs back on release. Mirrors Enter/Space for keyboard parity. | `scale 0.97`, `pressSpring`, `releaseSpring`, `keyboard true` |
| `useTilt` | 3D tilt of a surface toward the pointer (cards). | `max 6` (deg), `perspective 800`, `lift 0` (px toward viewer), `spring "tilt"` |
| `useWordRead` / `useMediaSettle` / `useKineticTrack` / `useTileAssemble` / `useUnderlineDraw` | Scroll scenes (`hooks/use-scroll-scene.ts`). | see the file |
| `useReveal` / `useBatch` | Lower-level primitives the `useSection*` hooks are built on (generic reveal, batched children). | see `tokens.ts` |

`useText` (word-split text) is not in the index; import it from `@/lib/motion/hooks/use-text`. The
index also exports `splitWords`, `scrollToY`, `motion`, `whenMotionReady`, `readMotionEnv`,
`MOTION` and `resolveEase`. There is no parallax hook and no counter hook.

```tsx
import { useMagnetic, usePress, useTilt } from "@/lib/motion";

const btnRef  = useMagnetic();              // <button ref={btnRef}>
const pressRef = usePress({ scale: 0.97 }); // tactile feedback
const cardRef = useTilt({ lift: 8 });       // <article ref={cardRef}> — 3D hover
```

**Capability gating (important — the doc's "respect reduced-motion" line undersells this).** Every
interaction hook reads `readMotionEnv()`:
- `env.reduce` — `prefers-reduced-motion` → magnetic and tilt are disabled; press dims the control
  instead of scaling it.
- `env.fine` — `(hover: hover) and (pointer: fine)`. Magnetic / tilt are **off on touch
  devices** by design; they never fight a finger. Press runs on touch too.
- `env.constrained` — low-power / save-data contexts → disabled.

So magnetic pull and tilt are **desktop-mouse-only flourishes**; the base interaction (click, focus,
press) always works everywhere. For video/social, treat these as the "feels alive on a laptop" layer,
not core motion.

### 10.11 Section archetype index

Section components live in `components/sections/` (some in subfolders per page) and a few sit beside
their route in `app/[locale]/`. They do not all share one shell: most use `Container` and
`SectionHeading`, but Work and FAQ build their own heading, and the hero is its own stage.

"World" below is the value read from each file: **explicit** = the section sets its own
`accent-world-*` class; **inherit** = it sets none and takes the world of its ancestor, or brand blue
at the root.

**Homepage sections**

| Section | File | World | What it is |
|---|---|---|---|
| Hero | `hero-section.server.tsx` + `hero-stage.tsx` | none (inverted, dark-locked stage) | Full-bleed photo and scrim, eyebrow, two-line `<h1>`, paragraph, CTA group. Entrance is a CSS first-paint arrival (`data-arrive`); the photo has scroll and pointer parallax. |
| Problem | `problem-section.tsx` + `problem-drawings.tsx` | **orange** (explicit) | Five hairline rows, each a framed line drawing of that problem + title + one-line cost; the drawings draw on entry. Heading keeps the light, dimmed second clause; no pin. |
| Ownership Stack | `ownership-stack-section.tsx` | **blue** (explicit) | Five sheets lifted by CSS `position: sticky`, the two deepest inverted. No pin, no GSAP. |
| Services | `services-section.tsx` | inherit | Four hairline discipline rows that open (display type, photo reveal, a CTA per row), then the standard list, then a next-step block. Rendered only inside `SceneInversionWrapper`. |
| Process | `process-section.tsx` | inherit | Five phases, one open at a time, then scope bars and a link to `/process`. Rendered only inside `SceneInversionWrapper`. |
| Work | `work-section.tsx` | **green** (explicit) | One display sentence whose three build names link to the case studies, plus a row of live URLs. |
| Trust | `trust-section.tsx` | **blue** (explicit) | Client-quote ledger, the founder's note with a drawn underline and signature, then a founder photo that expands on scroll with a closing quote. |
| Transparent by design | `transparent-by-design.tsx` (+ `-row.tsx`) | **blue** (explicit) | Server-rendered: one worked-example estimate at display size under a 2px rule, three numbered facts, CTA group. |
| CTA | `cta-section.tsx` → `section-end-cta.tsx` | set by the `world` prop (default orange) | Closing call to action; pages pass their own world. |

`components/scene-inversion-wrapper.tsx` holds Services and Process and sets `data-scene="inverted"`
once, when it scrolls into view.

**Home-page order:** Hero → Problem → Ownership Stack → `SceneInversionWrapper` (Services + Process)
→ Work → Trust → Transparent by design → CTA.

**Sections used on other pages**

| Section | File | World | Where / what |
|---|---|---|---|
| Page hero | `page-hero.tsx` | **blue** (explicit) | Bottom-anchored `<h1>` hero; `/faq`, `/writing`, legal pages. |
| Transparency estimator | `transparency-estimator.tsx` + `transparency-estimator/*` | **blue** (explicit) | `/transparency` only. Sticky instrument above the questions; no gradient accent. |
| Transparency chapter / measures | `transparency-chapter.tsx`, `transparency-measures-details-section.tsx` | **blue** (explicit) | `/transparency` chapter heading and measures. |
| FAQ | `faq-section.tsx` | inherit | `/pricing` only. Two columns: sticky title with a link to `/faq`, the shared `FaqList` beside it. |
| Audit lead capture | `audit-lead-capture.tsx` | inherit | Inline lead form on `/writing/[slug]` — a bordered card (`border-border-subtle bg-foreground/2 rounded-panel-sm p-8`), eyebrow + title + 3 trust-stat mini-cards + underline phone field + `MagneticButton`. Same underline-input idiom as §7.4. |
| Display close | `display-close.tsx` | the page's world | Closing block on the consulting, development and interface-design pages. |
| Pricing model | `pricing-model/*` | page hero blue | The body of `/pricing`. |
| Services index | `services-index/*` | hero orange; stage per service | `/services` hero and sticky stage. |
| Service pages | `consulting-audit/*`, `dev-studio/*`, `service-maintenance/*`, `interface-lab/*`, `plan-summary.tsx` | cyan / blue / green / violet | One signature per service page. |
| Route-local sections | `about/*`, `approach/*`, `process/*`, `standards/*` under `app/[locale]/` | set by the page wrapper | Sections that belong to one page only. |

`quote-artifact-section.tsx` and `technical-section.tsx` exist in the folder but nothing renders them.

**Worlds in use:** there are five — blue, orange, green, plus **violet** (interface design) and
**cyan** (consulting), the last two on service pages only. On the homepage orange is set only on
Problem (and is the CTA default), green only on Work, and blue on the ownership, trust and
transparency sections. Use this when excerpting a section for social: match the graphic's world to
the section's world above.

---

## 11. Quick Reference Card

```
BRAND BLUE     #0D6CE7   (HSL 214 89% 48%)   — the only "real" accent
INK            #0F0F0F   (HSL 0 0% 6%)        — text on light
PAPER          #FAFAFA   (HSL 0 0% 98%)       — light background
DARK BG        #121212   (HSL 0 0% 7%)        — dark background
DARK TEXT      #F0F0F0   (HSL 0 0% 94%)

WORLDS   blue=brand · orange(27°)=problem/CTA · green(158°)=proof/work
         violet=interface design · cyan=consulting (service pages only)
GRADIENTS  brand(blue), ember(orange), forest(green) — headline only, match the world

FONTS    Altruvex Sans for everything (Latin + Arabic) · no serif, italic or monospace
EMPHASIS Highlight=light, upright; grey, or the world gradient with tone="world" (craft/restraint)
         Accent=gradient (value/conversion)
         Strong=core claim · Dim=the dismissed "…not Y"

VOICE    precise · technical · unhedged · anti-template · transparent · founder-direct
IDIOM    "<the standard> — not <the cheap alternative>."
TAGLINE  "Architecture first. Performance by default."
```

---

*Maintained from `apps/www`. If a token here ever disagrees with `app/globals.css`, the CSS wins —
update this doc.*
