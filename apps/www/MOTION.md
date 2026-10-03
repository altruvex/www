# Motion system

`apps/www/lib/motion` — GSAP 3.15 + ScrollTrigger + CustomEase, Lenis 1.3 for
wheel smoothing, an in-house analytic spring solver for interaction. No
Framer, no `gsap/all`, no `Physics2DPlugin`.

Design-principles rules M1–M3 (`docs/design-principles.md`) are the law layer;
this document is the implementation layer.

## 1. Files

| file | role |
|---|---|
| `tokens.ts` | **Single source of truth**: `MOTION.{ease (incl. display, fade, fadeOut),duration (… settle, sweep),spring,distance,stagger (… sequence),trigger (… early),parallax,scroll (glide, read*, scrub.{tight,track,assemble,stage,pin}),reduced,text,section,anticipation,accent,theme,lenis}` + resolvers |
| `config.ts` | compat re-export of `MOTION` (older import path) |
| `utils/spring.ts` | analytic damped-harmonic spring, one shared `gsap.ticker` listener |
| `utils/env.ts` | `readMotionEnv()` → `{ reduce, constrained, fine, touch }` |
| `utils/direction.ts` | `readDirection(el)` (computed style) + `inlineSign` |
| `utils/ready.ts` | imperative "initial loader finished" bus (`whenMotionReady`) |
| `utils/arrival.ts` | **first-paint arrival**: CSS keyframes generated from `MOTION` + the loader-hold head script, rendered once in the root layout |
| `utils/presets.ts` | named configs (`motion.fadeUp()`, `motion.magneticButton()` …) |
| `utils/splite.ts` | DOM text splitter (char/word/line, Arabic-aware) |
| `utils/scroll.ts` | `scrollToY(top)` — programmatic jump through Lenis with `MOTION.scroll.glide`; reduced motion jumps |
| `utils/theme-switch.ts` `hooks/use-theme-switch.ts` | **theme switch** — the shared `@repo/ui/theme-switch` crossfade on `MOTION.theme`, which *is* that package's `THEME_CROSSFADE` (duration in seconds like every MOTION duration + easing, defined there once; admin uses the same object). `useThemeSwitch()` wraps next-themes' `setTheme` in one View Transition: the new theme fades in over a snapshot of the old, compositor-only, nothing transitions per element. Every theme control calls it; reduced motion / no support = instant swap. The `::view-transition-*(root)` rule in packages/ui tokens.css only turns off the browser's own blend |
| `hooks/use-magnetic.ts` `use-press.ts` `use-tilt.ts` | **interaction** primitives — spring-driven |
| `hooks/use-reveal.ts` `use-batch.ts` `use-text.ts` | **scroll** primitives — ScrollTrigger + duration/ease |
| `hooks/use-section-motion.ts` | section choreography wrappers |
| `hooks/use-scroll-scene.ts` | **scroll scenes** — `useWordRead` (+ `splitWords`), `useMediaSettle`, `useKineticTrack`, `useTileAssemble`, `useUnderlineDraw` |
| `smooth-scroll.tsx` `lenis-instance.ts` | Lenis boot, ScrollTrigger bridge, body-resize refresh |
| `lib/utils/gsap.ts` | plugin registration, CustomEase registration of every `MOTION.ease` string, `gsap.defaults` |

## 0. The rule — this folder is the heart

Every moving thing on the site takes its values from here: duration, ease,
distance, stagger, trigger position, scrub lag, spring. A section may call
GSAP directly, but never with a literal it could have taken from `MOTION`.
CSS transitions read the same scale through `--motion-*` / `--ease-*`
(globals.css), and `checkCssMotionTokens()` warns in development if the two
drift. New motion is added here first (a token or a hook), then used.

The one allowed kind of literal: **durations and positions inside a scrubbed
timeline** — there they are proportions of the scroll runway (choreography),
not seconds on the clock, and a shared scale would be meaningless.
Last full audit: 2026-09-19 — 0 clock literals outside this folder, the
consulting brief included (its marks pace on `MOTION.stagger.annotate`).

## 2. Token system

```ts
import { MOTION } from "@/lib/motion";

MOTION.duration.base        // 0.7  (instant .2 · drawer .3 · fast .4 · base .7 · text .9 · slow 1 · display 1.1 · settle 1.4 · sweep 2.6)
MOTION.ease.smooth          // "cubic-bezier(0.25, 0.46, 0.45, 0.94)" — works in CSS *and* GSAP
MOTION.spring.press         // { stiffness: 700, damping: 34, mass: 1 }   ζ≈0.64
MOTION.spring.release       // { stiffness: 380, damping: 20, mass: 1 }   ζ≈0.51 (one soft overshoot)
MOTION.spring.magnetic      // { stiffness: 220, damping: 24, mass: 1 }   ζ≈0.81
MOTION.spring.tilt          // { stiffness: 200, damping: 24, mass: 1 }   ζ≈0.85
MOTION.spring.snappy / gentle / bouncy
MOTION.distance.md          // 24px   (xs 8 · sm 16 · body 20 · md 24 · lg 40 · xl 64)
MOTION.stagger.base         // 0.06s  (tight .04 · word .05 · base .06 · display .07 · loose .08 · line .12)
MOTION.trigger.late         // "top 85%"
MOTION.reduced              // { duration: 0.18, ease: "power1.out", pressOpacity: 0.7 }
```

Rules:

- **Time-based motion** (reveals, route enter, scroll-linked) = `duration` + `ease`.
  Eases are CSS strings; `lib/utils/gsap.ts` registers each one as a CustomEase
  under its literal, so `ease: MOTION.ease.smooth` is valid in a tween. An
  unregistered `cubic-bezier(...)` string silently runs **linear** in GSAP —
  never hand-write one at a call site.
- **Interaction motion** (hover, press, drag-like) = `spring`. No duration.
  ζ = damping / (2·√(stiffness·mass)); < 1 overshoots, 1 is critically damped.
- Components never carry raw numbers: they call a preset (`motion.pressIcon()`)
  or a token. Presets may carry the one shape value that *defines* them
  (a magnetic `strength`); everything else in a preset is a token.
- `MOTION.text.*` / `MOTION.section.*` are the choreography defaults consumed
  by `useSection*`.

## 3. Primitive API

All hooks return a `RefObject`; attach it to the element. Animation state
lives in refs, springs and GSAP — **React never re-renders during motion**.

### Interaction (springs)

```ts
useMagnetic({ strength?, max?, spring? })          // x/y pull toward pointer, springs home on leave
usePress({ scale?, pressSpring?, releaseSpring?, keyboard? })  // scale on pointer/keyboard press
useTilt({ max?, perspective?, lift?, spring? })     // rotationX/Y (+z lift) following the pointer
```

Implementation contract, shared by all three:

- Values are written with `gsap.quickSetter(el, prop, unit)`: no per-frame
  allocation, and the write goes through GSAP's transform cache so `x`/`y`
  (magnetic) and `scale` (press) on the **same element** compose.
- Geometry (`getBoundingClientRect`) is read **once per hover** on
  `pointerenter`, never per `pointermove`. A per-move read after a transform
  write forces a style flush every move; it also includes the translate just
  applied, so the "centre" drifts. Scroll during hover is compensated with a
  `scrollY` delta. `useMagnetic` additionally subtracts its own current
  translate at measure time so the centre is the *resting* centre.
- `usePress` uses one `scale` spring and `retune()`s it between the press and
  release physics, so a release mid-press continues from the live velocity.
  Primary button only; ignores `disabled` / `aria-disabled`.
  **Gotcha:** `gsap.quickSetter(el, "scale")` is silently dead in GSAP 3.15 —
  CSSPlugin aliases `scale` → `"scaleX,scaleY"` before quickSetter resolves the
  setter, and the comma form falls through to a generic no-op. The hook drives
  `scaleX` and `scaleY` setters instead.
- Cleanup kills the springs, removes listeners and resets the transform
  components the hook owns (`x:0,y:0` / `scale:1`) — not `clearProps:"transform"`,
  which would wipe a sibling hook's state on the same element.

The custom cursor (`components/interactive/custom-cursor.tsx`) follows the same
contract: the dot is written straight from `pointermove`, the ring trail and
the hover scales share `MOTION.spring.gentle` (calm, no overshoot), and the
`[data-magnetic]` lean is measured once per hover. The ring is `.liquid-glass`,
and that class transitions `transform`; the ring's inline style narrows the
transition to opacity. A transform transition under a per-frame write restarts
every frame, and it was the 2026-09 "strange stutter": the ring lagged ~250px
and moved unevenly.

### `createSpring(setter, config, initial?)`

```ts
const s = createSpring(gsap.quickSetter(el, "x", "px"), MOTION.spring.magnetic);
s.set(40);      // retarget — keeps position AND velocity
s.retune(cfg);  // change physics without a jump
s.jump(0);      // teleport, no motion
s.kill();
```

Closed-form solution of the damped oscillator (under/critical/over-damped
branches), re-based from the current `(x, v)` on every `set`, so any frame
delta — a dropped frame, a tab hide — lands exactly on the curve. All springs
share **one** ticker listener that detaches when every spring is at rest; an
idle page pays nothing.

### Scroll (duration + ease, ScrollTrigger)

```ts
useReveal({ direction?, delay?, duration?, distance?, ease?, trigger?, once?, scrub?, anticipate? })
useBatch({ ...reveal, stagger?, selector?, alternate?, batchMax? })   // ScrollTrigger.batch over children
useText({ splitBy?, blur?, stagger?, ... })                            // split + stagger; Arabic → word-level only
```

- `direction`: `up | down | fade | scale` (physical) · `left | right`
  (physical) · **`start | end` (logical — mirrored in RTL). Prefer logical.**
- All scroll hooks wait on `whenMotionReady()` (fired by `LoadingProvider`
  once the initial loader is gone) instead of reading React context, so the
  ready flip doesn't re-render every animated element on the page.
- Each hook builds inside `gsap.context(…, el)` + `gsap.matchMedia()` and
  reverts on unmount / dependency change; App Router remounts are safe.
- `useText` `blur` is `filter`, i.e. re-rasterised per frame. It is a one-shot
  enter effect, never interaction-frequency, and is allowed only on fine-pointer
  non-constrained devices with ≤ `MOTION.text.blurCap` (16) fragments.

### Shared enter cores

- `<SectionHeading>` animates through the section hooks, once, on scroll-in.
- There is one implementation of each: `useReveal` and `useText` build their
  tweens through `playRevealEnter` (use-reveal.ts) / `textEnterVars`
  (utils/text-enter.ts), and only add the scroll trigger. Split, travel, scale, blur gating, ease, stagger cap and the Arabic
  rules (word-level, no blur, stagger from the end) cannot drift between
  callers. Never hand-roll a CSS or GSAP text rise for a heading; render a
  `SectionHeading`. The one exception is content on screen at first paint —
  see the next section.

### First-paint arrival (`utils/arrival.ts`)

```tsx
<Image data-arrive="media" … />                       // settles out of a 1.08 zoom
<div data-arrive="eyebrow">…</div>
<span data-arrive="line">…</span>                     // one per headline line
<span data-arrive="line" className="[--arrive-i:1]">…</span>
<p data-arrive="description">…</p>
<div data-arrive="element">…</div>                    // CTAs; --arrive-i for siblings
```

For content that is on screen when the page first paints (the homepage hero).
A GSAP entrance cannot start before React hydrates its component and runs on
the main thread, so above the fold it shows a frozen first frame and then
stutters through hydration's long tasks. These are CSS keyframes that start
with first paint and animate only `opacity` and the individual `translate` /
`scale` properties, so the compositor runs them (verified: no
`compositeFailed` in a Chromium trace, unaffected by 150ms hydration tasks at
4× CPU).

- **Same values as the section heading, no twin.** `ARRIVAL_CSS` is generated
  in TS from `MOTION.text` / `MOTION.section` / `MOTION.anticipation` /
  `MOTION.stagger.line`, and the root layout renders it in `<head>`. Change a
  token and the arrival follows.
- **Two differences from the scroll-in section heading, on purpose:** the title arrives
  by line (no split: no JS, and Arabic lines travel instead of fading as
  inline word boxes), and there is no blur (a filter repaints every frame, on
  the main thread in Safari).
- **Initial loader.** `ARRIVAL_HOLD_SCRIPT` runs inline in `<head>`, during
  parse; on a session's first visit it adds `arrival-hold` to `<html>`, which
  pauses every arrival on its first frame until `InitialLoader` sets
  `data-initial-load="complete"` (7s failsafe). It must stay an inline script:
  a `next/script` `beforeInteractive` Script only runs once the Next runtime
  boots, after first paint.
- **Client navigation.** The keyframes play as the page mounts, inside
  `template.tsx`'s route fade.
- **Never put `data-arrive` on an element GSAP moves.** The first time GSAP
  touches an element it folds a CSS `translate` / `scale` into its own
  transform and sets them to `none` (CSSPlugin), which kills the arrival. The
  hero's arrival sits on the `<img>`; its scroll trail and pointer drift move
  the `[data-hero-photo]` / `[data-hero-zoom]` wrappers.
- Anything below the fold keeps the GSAP section hooks: it animates on
  scroll-in, long after hydration.

### Scroll scenes (`hooks/use-scroll-scene.ts`)

Scrubbed, scroll-owned sequences that used to be hand-rolled per section. Each
returns a ref for its root and finds its parts by data attribute; timing lives
in `MOTION.scroll` / `MOTION.duration.settle`. First used on
/services/development (`components/sections/dev-studio`).

| hook | markup | does |
|---|---|---|
| `useWordRead()` | `[data-word]` spans (render with `splitWords(text)`) | colour `--read-dim` → `--foreground` per word over `readStart`→`readEnd` — colour, never opacity (Arabic ghosting); the tween drives `--read` 0→1 and `[data-word]` in globals.css mixes the two inks, so a theme switch re-colours the words |
| `useMediaSettle({ delay })` | root with a radius, `[data-settle-img]` inside | clip opens from an inset (resolved radius, not `var()`), image eases out of a 1.18 zoom on scroll |
| `useKineticTrack({ wipeAt })` | tall runway root, sticky stage, `[data-track]` copies, optional `[data-wipe]` layer | tracks cross the inline axis (RTL mirrored); the wipe layer rises through them |
| `useTileAssemble()` | `[data-tile]`s in `[data-tile-frame]`, optional `[data-tile-title]` in a mask | seeded scatter → assembled, then the title rises |

**New scroll motion goes here, not into the section** — add a hook or a token,
then use it.

### Scroll plumbing

- **No raw `scroll` listeners drive style.** Lenis is stepped from
  `gsap.ticker` (`autoRaf: false`) and calls `ScrollTrigger.update` *synchronously*
  in its `scroll` event — same frame as the transform, no one-frame lag on
  scrub tweens. Lenis is off on touch and under reduced motion (native scroll).
- A `ResizeObserver` on `<body>` calls `ScrollTrigger.refresh()` (rAF-debounced)
  so trigger positions follow late layout (fonts, footer wordmark, route change).
- `components/layout/nav.tsx` derives `isScrolled` (≥ 20px) and the
  services-wrapper inversion from a page-level `ScrollTrigger`'s `onUpdate` /
  `onRefresh` (a second trigger tracks the wrapper's `isActive`). It does not
  rely on `onToggle`: ScrollTrigger suppresses toggle callbacks while a refresh
  is in flight, and the body `ResizeObserver` refreshes often. A global
  `ScrollTrigger` `scrollEnd` listener re-syncs once scrolling stops. `setState`
  with an unchanged value bails out, so React commits only at the threshold
  crossings.
- Overlays must call `getLenis()?.stop()` (`hooks/use-lock-body-scroll.ts`
  does) because Lenis ignores `body { overflow:hidden }`.

## 4. Reduced motion — what each primitive degrades to

`prefers-reduced-motion: reduce` is a **code path** in every hook, not a CSS
kill switch. (`globals.css` also zeroes CSS transition/animation durations —
that covers Tailwind hover transitions; the hooks below never rely on it.)

| primitive | full | reduced |
|---|---|---|
| `useReveal` | translate/scale + opacity | opacity crossfade, `MOTION.reduced.duration` |
| `useBatch` | staggered translate + opacity | opacity crossfade, 20ms stagger (group semantics, zero vestibular cost) |
| `useText` | per-word translate/scale(/blur) stagger | whole-element opacity crossfade — the DOM is **not** split |
| `usePress` | scale spring | opacity dip to `MOTION.reduced.pressOpacity` and back — feedback survives |
| `useMagnetic` | x/y springs | none (position shift is motion); CSS hover styling remains |
| `useTilt` | rotation springs | none (rotation is vestibular); CSS hover styling remains |
| custom cursor | dot + spring-trailed ring | not mounted — the native cursor only |
| scroll scenes (`useWordRead` `useMediaSettle` `useKineticTrack` `useTileAssemble`) | scrubbed sequence | nothing is set — the markup's resting state is the reduced state (sections render a static fallback where the sticky runway would otherwise be empty) |
| `useUnderlineDraw` | one-shot staggered underline draw on scroll-in (`[data-draw]` background-size 0% → 100%) | nothing is set — the underlines rest fully drawn |
| `scrollToY` | Lenis glide | immediate jump |
| route `template.tsx` | 8px lift + fade | fade only |
| first-paint arrival (`data-arrive`) | translate/scale + opacity keyframes | nothing — the rules sit inside `prefers-reduced-motion: no-preference` |
| Lenis | smooth wheel | native scroll |

Scroll hooks use `gsap.matchMedia`, so flipping the OS setting mid-session
re-runs them. Interaction hooks read the preference at mount.

Capability gates (`readMotionEnv`): `fine` (hover + fine pointer) gates
magnetic/tilt/blur; `constrained` (≤4 cores, ≤4GB, or save-data — **not** "is
touch") gates parallax, counters, blur and text scale. Touch alone no longer
disables anything: modern phones are fast, and every scroll primitive runs on
native scroll there.

## 5. RTL

- Interaction hooks are pointer-relative and symmetric — no axis sign exists
  to get wrong. Verified by construction, and `useTilt` mirrors naturally.
- `useReveal` / `useBatch`: `start` / `end` resolve through
  `readDirection(el)` (computed `direction`, so a nested `dir` is honoured).
  `left` / `right` stay physical on purpose and are documented as such.
- `useText`: Arabic is detected by script ratio; it splits by **word only**
  (never char — shaping would break), keeps fragments `display:inline`, staggers
  `from: "end"`, and skips blur. The accent sweep starts from the opposite edge.
  Arabic fragments are inline boxes, so the `scrubExit` transform is opacity-only
  there.
- First-paint arrival lines rise vertically, so Arabic and English share them
  unchanged.
- Lenis and ScrollTrigger are axis-agnostic on vertical pages.

## 6. Performance verification recipe

Run in Chrome DevTools → Performance, 4× CPU throttle, 120Hz display if you
have one. Record the interaction, then check:

| primitive | drive | what to look for |
|---|---|---|
| magnetic / tilt | hover in, sweep across, leave | Main-thread track shows only tiny yellow (JS) slivers per frame from the ticker; **no purple Layout bars** and no "Recalculate Style" wider than a frame. Layers panel: element is its own compositor layer (`will-change: transform` on `MagneticButton` / `TiltCard`). Frames track solid green at the display rate. |
| press | mousedown, hold, release | A single continuous scale curve in the Animations panel — no restart at release (velocity carried). No task > 50ms. |
| reveals / text | scroll a section into view | Purple Layout should appear **once** at trigger creation / refresh, never per frame during the tween. `.m-word` layers composited; with `blur` a "filter" raster per frame is expected for ≤16 fragments — if it appears on > 16, the cap is broken. |
| scrub (parallax, scrubExit) | wheel through a section | Lenis frame and ScrollTrigger update in the **same** task each frame (no alternating scroll/animation tasks). No `scroll` event listener from the app in the Event Log (only Lenis' wheel + ScrollTrigger's cached scroll). |
| nav | scroll past 20px and across the services section | Exactly one React commit at each crossing (React DevTools profiler); nothing while scrolling between thresholds. |
| idle | leave the page alone 5s | Main thread flat; `gsap.ticker` still ticks (Lenis) but there is no spring listener (`gsap.ticker._listeners` back to baseline). |

Headless/hidden-tab check: `requestAnimationFrame` is frozen when the tab is
hidden, so drive frames with `setInterval(() => gsap.ticker.tick(), 16)` and
read `gsap.getProperty(el, "x")` — that is how the in-repo verification of the
springs was done (`window.gsap` is exposed in dev by `lib/utils/gsap.ts`).

Long-task guard: the app can be sampled with
`new PerformanceObserver(l => …).observe({ type: "longtask" })` during a
scripted hover/press/scroll sequence; the budget is **zero** entries > 50ms
attributable to motion.

## 7. Bundle

- Only `gsap`, `gsap/ScrollTrigger`, `gsap/CustomEase` are imported, once, in
  `lib/utils/gsap.ts`. Every route already uses reveals, so these live in the
  shared chunk deliberately; no other plugin is registered.
- Lenis is loaded via `next/dynamic` inside `SmoothScrollProvider` and only
  instantiated on fine-pointer, non-reduced-motion clients.

## 8. Known non-transform paint work (accepted, documented)

- `useText` `blur` (filter) — one-shot, capped.
- `<Accent animate="sweep">` pans `--sweep-x` (background-position) — one-shot.
- `MagneticButton` ripple — CSS keyframe on transform/opacity (fine); the
  hover transition list is `background-color, border-color, color, opacity`
  (box-shadow removed — it repainted every hover).
- `components/base/language-switcher-base.tsx` still repositions its floating
  menu from a `scroll` listener **while open only** — acceptable frequency,
  flagged for a future anchor-positioning rewrite.
