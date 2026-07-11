import { MOTION } from "@/lib/motion/config";
import { gsap } from "gsap";
import { CustomEase } from "gsap/CustomEase";
import { ScrollTrigger } from "gsap/ScrollTrigger";

if (typeof window !== "undefined") {
  gsap.registerPlugin(ScrollTrigger, CustomEase);
  ScrollTrigger.config({
    limitCallbacks: true,
    ignoreMobileResize: true,
    autoRefreshEvents: "visibilitychange,DOMContentLoaded,load",
  });

  gsap.config({
    nullTargetWarn: false,
    force3D: true,
  });

  // GSAP cannot parse CSS `cubic-bezier(...)` strings — unregistered ease
  // strings resolve to null and every tween silently runs linear. The MOTION
  // ease tokens are CSS strings (they're shared with CSS transitions), so each
  // one is registered here as a CustomEase under its own literal string:
  // GSAP's parser checks the ease map with the full string before parsing,
  // which makes `ease: MOTION.ease.smooth` work at every call site unchanged.
  Object.values(MOTION.ease).forEach((value) => {
    if (value.startsWith("cubic-bezier(")) {
      CustomEase.create(value, value.slice("cubic-bezier(".length, -1));
    }
  });

  gsap.defaults({
    ease: MOTION.ease.smooth,
    overwrite: "auto",
  });

  // Dev-only debug handle: lets DevTools (and headless verification) drive
  // gsap.updateRoot / inspect tweens. Stripped from production bundles.
  if (process.env.NODE_ENV !== "production") {
    (window as Window & { gsap?: typeof gsap }).gsap = gsap;
  }
}

export { gsap, ScrollTrigger };
