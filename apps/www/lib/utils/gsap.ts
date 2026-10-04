import { MOTION } from "@/lib/motion/tokens";
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

  Object.values(MOTION.ease).forEach((value) => {
    if (value.startsWith("cubic-bezier(")) {
      CustomEase.create(value, value.slice("cubic-bezier(".length, -1));
    }
  });

  gsap.defaults({
    ease: MOTION.ease.smooth,
    overwrite: "auto",
  });

  if (process.env.NODE_ENV !== "production") {
    (window as Window & { gsap?: typeof gsap }).gsap = gsap;
  }
}

export { gsap, ScrollTrigger };
