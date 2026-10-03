# Footer prototypes — 2026-10-03

Three directions for `apps/www/components/layout/footer.tsx`. Open `index.html`; the dark bar at the
bottom switches A / B / C, EN / AR (RTL) and light / dark. `?v=B&lang=ar&theme=dark` deep-links a state.

Kept from the current footer: every link and label in `messages/{en,ar}/footer.json` (services, company,
resources, privacy/terms/about), email + WhatsApp from `SITE_CONFIG`, localized year. Removed in all
three: the cropped `18vw` "Altruvex" wordmark (C replaces it with a fitted one).

- **A · Curtain** — the page lifts off a dark ground that was under it all along (CSS sticky; a negative
  `bottom` when the footer is taller than the viewport, so the reveal always starts at the closing line).
  One closing line at display size, the two doors (Estimate / Discuss), the register in four columns with
  direct lines as the fourth, a base with Back to top. Dark in both modes: the closing page of the dark
  sandwich (RUL-134 / SIG-013).
- **B · Colophon** — light and quiet, like the last page of a well-made book: who made this and where,
  email / WhatsApp / live Cairo time, the register numbered 01–03, a colophon line (set in Altruvex Sans,
  Arabic and English, built with Next.js) and the language + theme switches. No wordmark, no CTA.
  The clock updates once a minute, no idle animation.
- **C · Fitted mark** — today's idea corrected: a short closing line + the two doors, the register in a
  hairline grid (edge role C, `panel` radius) with direct lines and Cairo time in the last cell, and the
  wordmark measured to the column edge-to-edge (never cropped) that rises once from its baseline.

Research: ADI RUL-134, SIG-013, RUL-025 (closing CTA wins a colour collision), MOT-042 (Trionn footer
lines, sound opt-in — not used), CMP-076 (Kott named reader). Live, verified 2026-10-03: Trionn
(SOTD 2026-07-27) — quiet contact block, studio age as the trust line, no wordmark; Produx (SOTD
2026-08-09) — one link idiom, HQ column, no wordmark. Both skip the giant cropped wordmark, which is why
B drops it and C keeps it only fitted. The First The Last, Kott, Seasats, Sharplink footers were not
readable as text and are not cited.

Unreviewed copy: A "Built to be owned. Every line of it.", the studio line, B's name line and colophon,
C's closing sentence, "Direct lines", "Local time", "Back to top".
