"use client";

import { useMediaQuery } from "@/hooks/use-media-query";
import { MOTION } from "@/lib/motion/tokens";
import { createSpring } from "@/lib/motion/utils/spring";
import { gsap } from "@/lib/utils/gsap";
import { useEffect, useRef } from "react";

/*
 * The custom cursor: a brand dot that sits exactly on the pointer and a glass
 * ring that trails it on a spring. The ring and both hover scales share one
 * critically damped spring (MOTION.spring.gentle): an unhurried trail that
 * settles without overshoot, so the cursor never feels in a rush, while the
 * dot keeps the pointer itself exact.
 *
 * Only lib/motion springs and gsap.quickSetter write these transforms, and
 * nothing may transition them: a CSS transition that a per-frame write
 * retargets restarts every frame, falls far behind and moves unevenly. The
 * ring is .liquid-glass, whose transition list includes transform, so its
 * inline style narrows the transition to opacity. The springs are solved
 * analytically, so the trail is the same at 60 Hz, at 120 Hz and across a
 * dropped frame, and they sleep once at rest.
 *
 * Over a [data-magnetic] control the ring leans toward the control's resting
 * centre, measured once per hover with the control's own translate taken out
 * and page scroll compensated, as useMagnetic does.
 */

const SIZE = { ring: 32, dot: 8 };
/** Ring and dot scale over something clickable. */
const HOVER_SCALE = { ring: 1.4, dot: 0.6 };
/** Share of the way the ring leans from the pointer to a magnetic centre. */
const MAGNETIC_PULL = 0.15;
const INTERACTIVE = "button, a, [data-cursor-pointer]";
/** Show / hide. Replaces .liquid-glass's transition list on the ring. */
const FADE = "opacity var(--motion-drawer) var(--ease-default)";

type Setter = (value: number) => void;

function CustomCursor() {
  const ringRef = useRef<HTMLDivElement>(null);
  const dotRef = useRef<HTMLDivElement>(null);
  const finePointer = useMediaQuery("(hover: hover) and (pointer: fine)");
  const reducedMotion = useMediaQuery("(prefers-reduced-motion: reduce)");
  const enabled = finePointer && !reducedMotion;

  useEffect(() => {
    const ring = ringRef.current;
    const dot = dotRef.current;
    if (!enabled || !ring || !dot) return;

    const setter = (el: HTMLElement, prop: string, unit?: string): Setter =>
      gsap.quickSetter(el, prop, unit) as Setter;
    const scaleSetter = (el: HTMLElement): Setter => {
      const sx = setter(el, "scaleX");
      const sy = setter(el, "scaleY");
      return (v) => {
        sx(v);
        sy(v);
      };
    };

    const dotX = setter(dot, "x", "px");
    const dotY = setter(dot, "y", "px");
    const spring = MOTION.spring.gentle;
    const ringX = createSpring(setter(ring, "x", "px"), spring);
    const ringY = createSpring(setter(ring, "y", "px"), spring);
    const ringScale = createSpring(scaleSetter(ring), spring, 1);
    const dotScale = createSpring(scaleSetter(dot), spring, 1);

    let visible = false;
    let px = 0;
    let py = 0;
    let lastTarget: EventTarget | null = null;
    let magnet: HTMLElement | null = null;
    let cx = 0;
    let cy = 0;
    let scroll0 = 0;

    const show = (next: boolean) => {
      visible = next;
      ring.style.opacity = dot.style.opacity = next ? "1" : "0";
    };

    const measure = (el: HTMLElement) => {
      const r = el.getBoundingClientRect();
      cx = r.left + r.width / 2 - Number(gsap.getProperty(el, "x"));
      cy = r.top + r.height / 2 - Number(gsap.getProperty(el, "y"));
      scroll0 = window.scrollY;
    };

    const hover = (target: EventTarget | null) => {
      lastTarget = target;
      const el = target instanceof Element ? target : null;
      const active = el?.closest(INTERACTIVE) != null;
      ringScale.set(active ? HOVER_SCALE.ring : 1);
      dotScale.set(active ? HOVER_SCALE.dot : 1);
      const next = el?.closest<HTMLElement>("[data-magnetic]") ?? null;
      if (next !== magnet) {
        magnet = next;
        if (next) measure(next);
      }
    };

    const aim = () => {
      let tx = px;
      let ty = py;
      if (magnet) {
        tx += (cx - px) * MAGNETIC_PULL;
        ty += (cy - (window.scrollY - scroll0) - py) * MAGNETIC_PULL;
      }
      ringX.set(tx);
      ringY.set(ty);
    };

    const onMove = (e: PointerEvent) => {
      if (e.pointerType !== "mouse") return;
      px = e.clientX;
      py = e.clientY;
      dotX(px);
      dotY(py);
      if (e.target !== lastTarget) hover(e.target);
      if (!visible) {
        // Appear where the pointer is, never fly in from the last exit point.
        ringX.jump(px);
        ringY.jump(py);
        show(true);
      }
      aim();
    };

    // Hover changes the pointer did not move into (the page scrolled under it).
    const onOver = (e: PointerEvent) => {
      if (e.pointerType !== "mouse" || !visible) return;
      hover(e.target);
      aim();
    };

    // Left the window (or entered an iframe, which keeps its own events).
    const onOut = (e: PointerEvent) => {
      if (e.pointerType === "mouse" && e.relatedTarget === null) show(false);
    };

    document.addEventListener("pointermove", onMove, { passive: true });
    document.addEventListener("pointerover", onOver, { passive: true });
    document.addEventListener("pointerout", onOut, { passive: true });

    return () => {
      document.removeEventListener("pointermove", onMove);
      document.removeEventListener("pointerover", onOver);
      document.removeEventListener("pointerout", onOut);
      ringX.kill();
      ringY.kill();
      ringScale.kill();
      dotScale.kill();
    };
  }, [enabled]);

  if (!enabled) return null;

  return (
    <>
      <div
        ref={ringRef}
        aria-hidden
        data-cursor-ring
        className="liquid-glass pointer-events-none fixed z-[9998] rounded-full opacity-0 will-change-transform"
        style={{
          width: SIZE.ring,
          height: SIZE.ring,
          left: -SIZE.ring / 2,
          top: -SIZE.ring / 2,
          transition: FADE,
        }}
      />
      <div
        ref={dotRef}
        aria-hidden
        data-cursor-dot
        className="pointer-events-none fixed z-[9999] rounded-full bg-brand opacity-0 transition-opacity duration-(--motion-drawer) ease-default will-change-transform"
        style={{ width: SIZE.dot, height: SIZE.dot, left: -SIZE.dot / 2, top: -SIZE.dot / 2 }}
      />
    </>
  );
}

export default CustomCursor;
