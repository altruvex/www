# Motion system

`apps/www/lib/motion` — GSAP 3.15 + ScrollTrigger + CustomEase, Lenis 1.3 for
wheel smoothing, an in-house analytic spring solver for interaction. No
Framer, no `gsap/all`, no `Physics2DPlugin`.

Design-principles rules M1–M3 (`docs/design-principles.md`) are the law layer;
this document is the implementation layer.

## 1. Files

| file | role |
|---|---|
| `tokens.ts` | **Single source of truth**: `MOTION.{ease,duration,spring,distance,stagger,trigger,parallax,reduced,text,section,anticipation,loader,accent,lenis}` + resolvers |
| `config.ts` | compat re-exports of `tokens` + `getConstrainedDevice` (older import path) |
| `utils/spring.ts` | analytic damped-harmonic spring, one shared `gsap.ticker` listener |
| `utils/env.ts` | `readMotionEnv()` → `{ reduce, constrained, fine, touch }` |
| `utils/direction.ts` | `readDirection(el)` (computed style) + `inlineSign` |
| `utils/ready.ts` | imperative "initial loader finished" bus (`whenMotionReady`) |
| `utils/presets.ts` | named configs (`motion.fadeUp()`, `motion.magneticButton()` …) |
| `utils/splite.ts` | DOM text splitter (char/word/line, Arabic-aware) |
| `hooks/use-magnetic.ts` `use-press.ts` `use-tilt.ts` | **interaction** primitives — spring-driven |
| `hooks/use-reveal.ts` `use-batch.ts` `use-text.ts` `use-counter.ts` `use-parallax.ts` | **scroll** primitives — ScrollTrigger + duration/ease |
| `hooks/use-section-motion.ts` | section choreography wrappers |
| `smooth-scroll.tsx` `lenis-instance.ts` | Lenis boot, ScrollTrigger bridge, body-resize refresh |
| `lib/utils/gsap.ts` | plugin registration, CustomEase registration of every `MOTION.ease` string, `gsap.defaults` |

## 2. Token system

```ts
import { MOTION } from "@/lib/motion";

MOTION.duration.base        // 0.7  (instant .2 · drawer .3 · fast .4 · base .7 · text .9 · slow 1 · display 1.1)
MOTION.ease.smooth          // "cubic-bezier(0.25, 0.46, 0.45, 0.94)" — works in CSS *and* GSAP
MOTION.spring.press         // { stiffness: 700, damping: 34, mass: 1 }   ζ≈0.64
MOTION.spring.release       // { stiffness: 380, damping: 20, mass: 1 }   ζ≈0.51 (one soft overshoot)
MOTION.spring.magnetic      // { stiffness: 220, damping: 24, mass: 1 }   ζ≈0.81
MOTION.spring.tilt          // { stiffness: 200, damping: 24, mass: 1 }   ζ≈0.85
MOTION.spring.snappy / gentle / bouncy
MOTION.distance.md          // 24px   (xs 8 · sm 16 · body 20 · md 24 · lg 40 · xl 64)
MOTION.stagger.base         // 0.06s  (tight .04 · word .05 · base .06 · display .07 · loose .08)
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
  by `useSection*`. `DEFAULTS` / `SECTION_DELAYS` are aliases kept for old imports.

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
useCounter({ from?, to, ... })                                          // number tween, tabular-nums
useParallax({ speed?, direction?, scrub?, anchor? })                    // yPercent/xPercent scrub
```

- `direction`: `up | down | fade | scale` (physical) · `left | right`
  (physical) · **`start | end` (logical — mirrored in RTL). Prefer logical.**
- All scroll hooks wait on `whenMotionReady()` (fired by `LoadingProvider`
  once the initial loader is gone) instead of reading React context, so the
  ready flip doesn't re-render every animated element on the page.
- Each hook builds inside `gsap.context(…, el)` + `gsap.matchMedia()` and
  reverts on unmount / dependency change; App Router remounts are safe.
- `useCounter` is the one primitive that is not transform-only (text changes
  lay out). It sets `font-variant-numeric: tabular-nums` so the box width never
  changes and the layout stays local to the element.
- `useText` `blur` is `filter`, i.e. re-rasterised per frame. It is a one-shot
  enter effect, never interaction-frequency, and is allowed only on fine-pointer
  non-constrained devices with ≤ `MOTION.text.blurCap` (16) fragments.

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
| `useCounter` | count-up | final value written immediately |
| `useParallax` | scrub travel | static (rest position) |
| `usePress` | scale spring | opacity dip to `MOTION.reduced.pressOpacity` and back — feedback survives |
| `useMagnetic` | x/y springs | none (position shift is motion); CSS hover styling remains |
| `useTilt` | rotation springs | none (rotation is vestibular); CSS hover styling remains |
| route `template.tsx` | 8px lift + fade | fade only |
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
- `useParallax({ direction: "x" })` is logical — sign flips in RTL.
- `useText`: Arabic is detected by script ratio; it splits by **word only**
  (never char — shaping would break), keeps fragments `display:inline`, staggers
  `from: "end"`, and skips blur. The accent sweep starts from the opposite edge.
  Arabic fragments are inline boxes, so the `scrubExit` transform is opacity-only
  there.
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
- `@gsap/react` is installed but unused; the hooks already do what `useGSAP`
  does (`gsap.context` + layout effect + revert).

## 8. Known non-transform paint work (accepted, documented)

- `useText` `blur` (filter) — one-shot, capped.
- `<Accent animate="sweep">` pans `--sweep-x` (background-position) — one-shot.
- `useCounter` text writes — inherent; `tabular-nums` keeps it local.
- `MagneticButton` ripple — CSS keyframe on transform/opacity (fine); the
  hover transition list is `background-color, border-color, color, opacity`
  (box-shadow removed — it repainted every hover).
- `components/base/language-switcher-base.tsx` still repositions its floating
  menu from a `scroll` listener **while open only** — acceptable frequency,
  flagged for a future anchor-positioning rewrite.
