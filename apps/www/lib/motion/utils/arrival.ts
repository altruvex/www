import { MOTION } from "../tokens";
import { INITIAL_LOAD_KEY } from "./ready";

const HOLD_CLASS = "arrival-hold";

const HOLD_FAILSAFE_MS = 7000;

const MEDIA_FROM_SCALE = 1.08;

const LINE_FROM_SCALE = 0.96;

const FADE_EASE = MOTION.ease.smooth;

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

export const ARRIVAL_HOLD_SCRIPT = `(function(){try{if(sessionStorage.getItem("${INITIAL_LOAD_KEY}"))return;var d=document.documentElement;d.classList.add("${HOLD_CLASS}");setTimeout(function(){d.classList.remove("${HOLD_CLASS}")},${HOLD_FAILSAFE_MS})}catch(e){}})();`;
