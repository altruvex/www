# Nav prototypes — 2026-10-03

Three directions for `apps/www/components/layout/nav.tsx` and its parts (language switcher,
theme switcher, mobile menu). Open `index.html`; the dark bar at the bottom switches A / B / C.
Narrow the window under 1024px for the mobile menu. Every switcher works (EN/AR + RTL, light/dark/system).

Kept from the current nav (memory `altruvex-nav-rebuild`): links Work/Services/Pricing/About/Contact,
no Transparency link, no search button, brand-blue CTA, inversion over `data-nav-invert` islands and the
hero stage, `data-lenis-prevent` menus.

- **A · Rule & thumb** — today's bar, refined: one brand rule shared by all links that rests under the
  current page and follows the pointer; pill theme switch (RUL-071 allows pills on toggles); bar
  condenses on scroll and hides on scroll-down, returns on scroll-up. Mobile: full sheet that wipes down,
  numbered rows rise in, segmented language + theme (with System) at the foot.
- **B · Two registers** — a thin utility strip above the bar (Cairo + live Cairo time, email, schedule,
  compact language and theme segments) that folds away on scroll; bar = logo | links (brand dot on the
  current page) | CTA. Mobile: full-screen fade with large light-weight links, then direct lines and
  switchers. Idea: Trionn / LPAS (contact details live inside the nav layer).
- **C · The island** — full-width at the top; on scroll the bar detaches into a floating glass island.
  An "Index" button opens a panel from the island (it widens to hold it): pages with a one-line
  description, the how-we-work pages, direct lines, and the language + theme controls.

Research: ADI RUL-058, RUL-071, MOT-027, MOT-056, SIT-016; live — The First The Last (menu overlay with
CTA apart from the links), LxL Creative SOTD 2026-09-17 (inline bar, no desktop hamburger), Trionn,
LPAS HM 2026-08-30. No award site showed a language or theme switcher, so those are house-designed.

Unreviewed copy: C's one-line page descriptions, "Index", "Direct lines", and the filler page text.
