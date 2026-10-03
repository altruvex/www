/**
 * First-paint arrival: the section-heading entrance for content that is on
 * screen when the page first paints (the homepage hero).
 *
 * Why this is CSS and not GSAP. A GSAP entrance can only start once React has
 * hydrated its component, and it runs on the main thread. When hydration is
 * slow (Safari, a cold cache, a dev build) the first frame sits on screen
 * looking like a loading state, then plays while hydration is still busy and
 * stutters. These keyframes start with first paint, never wait for JS, and
 * touch only opacity and the individual `translate` / `scale` properties, so
 * the compositor runs them.
 *
 * The values are the section-heading presets (MOTION.text, MOTION.section,
 * MOTION.anticipation) generated into CSS here, so there is no CSS twin to
 * drift. Two differences from the GSAP heading, on purpose:
 * - The title arrives by line, not by word. No split means no JS, and Arabic
 *   lines travel too (split Arabic words are inline boxes that can only fade).
 * - No blur. A filter is repainted every frame, on the main thread in Safari.
 *
 * Usage: mark elements `data-arrive="<role>"` (media, eyebrow, line,
 * description, element — the rules in ARRIVAL_CSS); `line` and `element` take their
 * index as `--arrive-i`. The root layout renders ARRIVAL_CSS and
 * ARRIVAL_HOLD_SCRIPT once, in <head>.
 *
 * - First visit of a session: the InitialLoader covers the page, so the head
 *   script puts `arrival-hold` on <html> and the arrivals wait, paused on their
 *   first frame, until the loader sets data-initial-load="complete". A
 *   failsafe releases them if the loader never finishes.
 * - Client navigation: the keyframes play as the page mounts, inside
 *   app/[locale]/template.tsx's route fade.
 * - Reduced motion: nothing animates; the content is simply there.
 *
 * GSAP folds a CSS `scale` / `translate` into its own transform the first time
 * it touches an element, so never put `data-arrive` on an element GSAP moves.
 */
import { MOTION } from "../tokens";
import { INITIAL_LOAD_KEY } from "./ready";

const HOLD_CLASS = "arrival-hold";

/** Longest the arrivals wait for the InitialLoader: it plays for about 3.5 s
    on desktop, counted from hydration. */
const HOLD_FAILSAFE_MS = 7000;

/** A photo settles from this zoom to rest. */
const MEDIA_FROM_SCALE = 1.08;

/** From the heading's word entrance (text-enter.ts). */
const LINE_FROM_SCALE = 0.96;

/** CSS form of MOTION.ease.fade: GSAP's power1.out is quad-out, and quad-out
    is exactly the smooth curve. */
const FADE_EASE = MOTION.ease.smooth;

/** The reveal hook's default ease (use-reveal.ts), which the eyebrow,
    description and element presets inherit. */
const REVEAL_EASE = MOTION.ease.smooth;

const ms = (seconds: number): string => `${Math.round(seconds * 1000)}ms`;
const percent = (share: number): string => `${Math.round(share * 100)}%`;

const { heading, body, element } = MOTION.text;
const A = MOTION.anticipation;

export const ARRIVAL_CSS = `
@keyframes arrive-settle {
  from { scale: ${MEDIA_FROM_SCALE}; }
}
@keyframes arrive-rise {
  from { opacity: 0; translate: 0 var(--arrive-y); scale: var(--arrive-scale, 1); }
}
@keyframes arrive-rise-anticipate {
  from { opacity: 0; translate: 0 var(--arrive-y); animation-timing-function: ${FADE_EASE}; }
  ${percent(A.durationShare)} { opacity: ${A.opacity}; translate: 0 calc(var(--arrive-y) * ${1 + A.travel}); }
}
@media (prefers-reduced-motion: no-preference) {
  [data-arrive="media"] {
    animation: arrive-settle ${ms(MOTION.duration.settle)} ${MOTION.ease.strong} backwards;
  }
  [data-arrive="eyebrow"] {
    --arrive-y: ${body.distance}px;
    animation: arrive-rise ${ms(body.duration)} ${REVEAL_EASE} ${ms(MOTION.section.eyebrow)} backwards;
  }
  [data-arrive="line"] {
    --arrive-y: ${heading.distance}px;
    --arrive-scale: ${LINE_FROM_SCALE};
    animation: arrive-rise ${ms(heading.duration)} ${MOTION.ease.text} calc(var(--arrive-i, 0) * ${ms(MOTION.stagger.line)}) backwards;
  }
  [data-arrive="description"] {
    --arrive-y: ${body.distance}px;
    animation: arrive-rise ${ms(body.duration)} ${REVEAL_EASE} ${ms(MOTION.section.description)} backwards;
  }
  [data-arrive="element"] {
    --arrive-y: ${element.distance}px;
    animation: arrive-rise-anticipate ${ms(element.duration)} ${REVEAL_EASE} calc(${ms(MOTION.section.element)} + var(--arrive-i, 0) * ${ms(MOTION.stagger.loose)}) backwards;
  }
  .${HOLD_CLASS}:not([data-initial-load="complete"]) [data-arrive] {
    animation-play-state: paused;
  }
}
`;

/*
 * Runs during parse, before first paint. A next/script beforeInteractive
 * Script would not do: it is queued on self.__next_s and only runs once the
 * Next runtime boots, after first paint, so the arrivals would already be
 * playing under the loader. The CSP allows inline scripts ('unsafe-inline',
 * no nonce — lib/config/csp.ts), as it does for next-themes' own script.
 */
export const ARRIVAL_HOLD_SCRIPT = `(function(){try{if(sessionStorage.getItem("${INITIAL_LOAD_KEY}"))return;var d=document.documentElement;d.classList.add("${HOLD_CLASS}");setTimeout(function(){d.classList.remove("${HOLD_CLASS}")},${HOLD_FAILSAFE_MS})}catch(e){}})();`;
