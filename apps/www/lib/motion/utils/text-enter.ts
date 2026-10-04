import { gsap } from "@/lib/utils/gsap";
import { MOTION, resolveEase, type MotionEase } from "../tokens";
import { readMotionEnv } from "./env";
import { autoSplit } from "./splite";

type TextSplit = "char" | "word" | "line";

interface TextTargets {
  targets: Element[];
  isRTL: boolean;
  scriptAllowsBlur: boolean;
}

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
