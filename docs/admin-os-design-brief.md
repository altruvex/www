# Design Brief — Altruvex Admin OS

Deliverable   : product UI — internal operating system (Next.js 16 app, apps/admin)
Brand owner   : Altruvex (internal surface, not public marketing)
Direction     : `industrial-brutalist-ui` § 2.1 Swiss Industrial Print, DE-RADICALIZED.
                Taken: rigid modular grid, visible hairline structure, mono micro-labels
                for all metadata/telemetry, extreme scale contrast (12px data vs 28px
                structural numerals), purely utilitarian palette, zero decoration.
                Rejected explicitly: CRT/scanlines, halftone/dither, phosphor glow,
                ASCII framing, viewport-bleeding numerals, all-caps prose, the
                Archivo-Black/Monument display face, the Inter ban (repo outranks it).
                Why: the brief asks for "data-heavy, technical, high density, restrained,
                Linear/Stripe" — that is Swiss print discipline, not the CRT theatre.
Risk taken    : the sidebar and every table row are separated by 1px hairlines with NO
                card chrome and NO shadow. Panels are flat planes divided by rules, not
                floating cards. This is the one departure from the marketing site, which
                is all rounded-3xl glass. Justification: 40 modules of dense tabular data
                cannot each be a floating card without becoming visual soup.
Palette       : (final, measured — every pair ≥ 4.5:1 AA in both themes)
                bg      #F7F8FA  (light) / #14171C (dark)   — cooler + flatter than www
                surface #FFFFFF        / #191D23
                fg      #0B0D12        / #E7EAF0
                brand   hsl(226 60% 56%) #4F62D4  (unchanged — Altruvex blue)
                Status tones (light): neutral 220 10% 41% · info 226 60% 51% ·
                success 162 88% 24% · warning 33 92% 30% · danger 0 66% 45% ·
                progress 258 68% 54%. Dark re-derived, not inverted.
                Charts: --chart-1..6, a separate categorical ramp, validated with
                dataviz/scripts/validate_palette.js for light and dark separately.
Type          : display Outfit 400/500/600 (structural headers ONLY, capped at 28px)
                body    Inter 400/500/600 @ 13px base, leading 1.45 (was 17-18px/1.75)
                mono    Geist Mono 11-12px, +0.08em tracking — IDs, money, dates, labels
                tabular-nums on every numeric column. Script: latin-only surface (admin
                is English-only; RTL kept via logical properties but not a shipped locale).
Tokens        : apps/admin/app/globals.css — OWN operational layer, same semantic names
                as apps/www so no second vocabulary; adds --density-*, --elev-*,
                --status-*, --row-h, --sidebar-w. No component touches a primitive.
Motion        : philosophy `emil-design-eng` — invisible, functional, interruptible.
                Budget: 120ms state changes, 180ms panel/sheet, 0ms for anything that
                blocks reading data. No entrance animations on tables or rows.
                The one moment that matters: the command palette open (scale .98→1 + 120ms).
Stack         : Next.js 16 App Router / React 19 / Tailwind v4 / Radix primitives / Prisma
Constraints   : dark mode required (both directions), WCAG 2.2 AA floor, keyboard-first,
                mobile card fallback for every table, RBAC-aware nav, no fake data —
                unmodeled modules render an honest Planned state, never a mock screen.
Out of scope  : real WhatsApp Cloud API sends; e-signature vendor integration; payment
                gateway; charting library.
                (Superseded 2026-09: "no new Prisma models" applied to the first pass
                only. The engineering-operations pass added Product/Build/Deployment/
                LogEntry/Incident/ProjectTask/ActivityEvent — see docs/admin-os.md.
                The design constraints above are unchanged and still binding.)
