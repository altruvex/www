/**
 * The site's text entrance, as a reusable core.
 *
 * `useText` plays this once, when its element scrolls in. Some surfaces need
 * the same entrance replayed on demand — a stage that swaps its copy as the
 * visitor scrolls, for instance. Both go through here, so a heading entering
 * on /services moves exactly like every section title on the site: the same
 * split, the same travel, scale and blur, the same ease, the same Arabic
 * rules. There is no second text animation to drift from the first.
 */
import { gsap } from "@/lib/utils/gsap";
import { MOTION, resolveEase, type MotionEase } from "../tokens";
import { readMotionEnv } from "./env";
import { autoSplit } from "./splite";

type TextSplit = "char" | "word" | "line";

interface TextTargets {
  targets: Element[];
  isRTL: boolean;
  /** Latin only — Arabic fragments are never blurred. */
  scriptAllowsBlur: boolean;
}

/**
 * Splits `el` once and returns its fragments. A second call reuses the
 * existing split instead of rewriting the DOM again.
 */
export function splitText(el: HTMLElement, splitBy: TextSplit): TextTargets {
  if (!el.hasAttribute("data-m-split")) {
    el.setAttribute("data-m-split", splitBy);
    const result = autoSplit(el, splitBy);
    return {
      targets: result.targets.length ? result.targets : [el],
      isRTL: result.isRTL,
      scriptAllowsBlur: result.canBlur,
    };
  }

  const splitType = el.getAttribute("data-m-split");
  const selector =
    splitType === "char" ? ".m-char" : splitType === "word" ? ".m-word" : ".m-line";
  const targets = Array.from(el.querySelectorAll(selector));
  const isRTL = targets.some(
    (target) => (target as HTMLElement).dataset.script === "arabic",
  );
  return {
    targets: targets.length ? targets : [el],
    isRTL,
    scriptAllowsBlur: !isRTL,
  };
}

interface TextEnterShape {
  duration: number;
  stagger: number;
  distance: number;
  ease: string | MotionEase;
  blur: boolean;
  delay?: number;
}

/**
 * The from-state and to-state of the entrance for a set of fragments. Blur is
 * a one-shot enter effect only: fine pointer, unconstrained device, Latin
 * script, and at most `MOTION.text.blurCap` fragments.
 */
export function textEnterVars(
  split: TextTargets,
  shape: TextEnterShape,
): { from: gsap.TweenVars; to: gsap.TweenVars } {
  const env = readMotionEnv();
  const constrained = env.constrained;
  const { targets, isRTL, scriptAllowsBlur } = split;

  const canBlur =
    shape.blur &&
    scriptAllowsBlur &&
    env.fine &&
    !constrained &&
    targets.length <= MOTION.text.blurCap;

  const effectiveStagger =
    targets.length > 1
      ? Math.min(shape.stagger, MOTION.text.maxTotalStagger / targets.length)
      : shape.stagger;

  const from: gsap.TweenVars = {
    opacity: 0,
    y: shape.distance,
    willChange: "transform, opacity",
  };
  if (!constrained) from.scale = 0.96;
  if (canBlur) from.filter = "blur(4px)";

  const to: gsap.TweenVars = {
    opacity: 1,
    y: 0,
    duration: shape.duration,
    stagger: { each: effectiveStagger, from: isRTL ? "end" : "start" },
    delay: shape.delay ?? 0,
    ease: resolveEase(shape.ease),
    force3D: true,
    overwrite: "auto",
    onComplete() {
      gsap.set(targets, { clearProps: "willChange,filter,transform" });
    },
  };
  if (!constrained) to.scale = 1;
  if (canBlur) to.filter = "blur(0px)";

  return { from, to };
}

/** The section-title entrance shape — what `useSectionTitle` plays. */
const HEADING_ENTER: TextEnterShape = {
  duration: MOTION.text.heading.duration,
  stagger: MOTION.text.heading.stagger,
  distance: MOTION.text.heading.distance,
  ease: MOTION.ease.text,
  blur: MOTION.text.heading.blur,
};

/**
 * Plays the entrance on `el` now, with no scroll trigger — for copy that
 * enters on a state change rather than on arrival. Callers own the
 * reduced-motion branch (`REDUCED_FADE` on the whole element, no split),
 * exactly as `useText` does.
 */
export function playTextEnter(
  el: HTMLElement,
  shape: TextEnterShape = HEADING_ENTER,
  splitBy: TextSplit = "word",
): gsap.core.Tween {
  const split = splitText(el, splitBy);
  const { from, to } = textEnterVars(split, shape);
  return gsap.fromTo(split.targets, from, to);
}
