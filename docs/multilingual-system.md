# Multilingual system (binding, Ali, 2026-10-05)

Altruvex is one multilingual system with locale-aware rendering. English and Arabic are the locales that ship
today; they are not the boundary of the design system. A new locale must inherit the same system without a new
visual language.

**One hierarchy. One design language. Many languages.**

## Shared across every locale

Typography hierarchy, heading hierarchy, hero scale, CTA hierarchy, section hierarchy, spacing principles,
responsive behaviour, content density, visual rhythm, information architecture, navigation logic and
interaction patterns. Never a separate visual system per language, and never a separate one for RTL vs LTR.

## Allowed per-locale adjustments

Small corrections a script genuinely needs for readability or balance: max-width, line-height, optical
font-size, a breakpoint, wrapping control, text alignment, font fallback. These are implementation
adjustments, keyed to a property of the script or direction (e.g. `:lang()`, `dir`, a per-locale config
entry), not branches that assume only `en` and `ar` exist.

## Rules for code

- Design a component around its semantic hierarchy and visual scale, then validate it in every locale.
  English is not the reference; neither is Arabic.
- No locale magic numbers, no language-specific hero heights, no fixed line breaks. No `<br>` to force a
  composition unless it is intentional and survives every locale; prefer natural wrapping + controlled max-width.
- No `locale === "ar" ? A : B` where `B` silently becomes the answer for every future locale. Derive from
  the locale's properties (direction, script, Intl data) or from a per-locale table in `i18n/` config that a
  new locale must fill in.
- Direction is a rendering property: logical CSS properties (`ms-`, `pe-`, `start`, `end`, `rtl:` only where
  the script needs it) and the existing RTL infrastructure.
- Formatting (numbers, dates, times, currency) goes through Intl with the locale's own tag. Site-wide
  exception decided by Ali (2026-10-04): figures use Latin digits in every locale (`-u-nu-latn`).

## Content and SEO

Each locale keeps the page intent, business meaning, CTA intent, semantic hierarchy, search intent, offer,
commercial terms, positioning and factual claims. Phrasing is natural to its audience, never literal.
Metadata and keywords follow each locale's own search language; never translate keywords word for word, and
never force one locale's keyword structure on another.

## Done means

Validated in every supported locale at narrow, mobile, tablet, desktop and wide widths. Heroes are checked
for perceived scale, line count, line-height, width, wrapping, emphasis, CTA position, height, balance,
collision risk and breakpoint transitions. "EN looks right" or "EN + AR look right" is not done; the
system holding for the next locale is.
