"use client";

import { useMediaQuery } from "@/lib/use-media-query";
import { useEffect, useRef } from "react";

const CURSOR_SIZE = { outer: 32, inner: 8 };
const IDLE_TIMEOUT = 2000;
const LERP_FACTOR = 0.05;
const MAGNETIC_STRENGTH = 0.15;

function CustomCursor() {
  const outerRef = useRef<HTMLDivElement>(null);
  const innerRef = useRef<HTMLDivElement>(null);

  const prefersFinePointer = useMediaQuery("(pointer: fine)");
  const prefersReducedMotion = useMediaQuery(
    "(prefers-reduced-motion: reduce)",
  );
  const enabled = prefersFinePointer && !prefersReducedMotion;

  const state = useRef({
    mouseX: 0,
    mouseY: 0,
    currentX: 0,
    currentY: 0,
    isPointer: false,
    raf: 0,
    lastMove: 0,
    magnetic: null as null | { x: number; y: number },
    lastMagneticEl: null as HTMLElement | null,
    lastRect: null as DOMRect | null,
  });

  useEffect(() => {
    if (!enabled) return;

    const s = state.current;
    const outer = outerRef.current!;
    const inner = innerRef.current!;

    const loop = () => {
      const now = performance.now();

      if (now - s.lastMove > IDLE_TIMEOUT) {
        cancelAnimationFrame(s.raf);
        s.raf = 0;
        return;
      }

      let tx = s.mouseX;
      let ty = s.mouseY;

      if (s.magnetic) {
        tx += (s.magnetic.x - s.mouseX) * MAGNETIC_STRENGTH;
        ty += (s.magnetic.y - s.mouseY) * MAGNETIC_STRENGTH;
      }

      s.currentX += (tx - s.currentX) * LERP_FACTOR;
      s.currentY += (ty - s.currentY) * LERP_FACTOR;

      const base = `translate3d(${s.currentX}px, ${s.currentY}px, 0) translate(-50%, -50%)`;

      outer.style.transform = `${base} scale(${s.isPointer ? 1.4 : 1})`;
      inner.style.transform = `${base} scale(${s.isPointer ? 0.6 : 1})`;

      s.raf = requestAnimationFrame(loop);
    };

    const onMove = (e: MouseEvent) => {
      const target = e.target as HTMLElement;

      s.mouseX = e.clientX;
      s.mouseY = e.clientY;
      s.lastMove = performance.now();

      const magneticEl = target.closest(
        "[data-magnetic]",
      ) as HTMLElement | null;

      if (magneticEl) {
        if (s.lastMagneticEl !== magneticEl) {
          s.lastRect = magneticEl.getBoundingClientRect();
          s.lastMagneticEl = magneticEl;
        }
        const rect = s.lastRect!;
        s.magnetic = {
          x: rect.left + rect.width / 2,
          y: rect.top + rect.height / 2,
        };
      } else {
        s.lastMagneticEl = null;
        s.lastRect = null;
        s.magnetic = null;
      }

      const pointer =
        target.closest("button, a, [data-cursor-pointer]") !== null;

      s.isPointer = pointer;

      if (!s.raf) {
        s.raf = requestAnimationFrame(loop);
      }
    };

    const onLeave = () => {
      outer.style.opacity = "0";
      inner.style.opacity = "0";
    };

    const onEnter = () => {
      outer.style.opacity = "1";
      inner.style.opacity = "1";
    };

    window.addEventListener("mousemove", onMove, { passive: true });
    window.addEventListener("mouseleave", onLeave);
    window.addEventListener("mouseenter", onEnter);

    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseleave", onLeave);
      window.removeEventListener("mouseenter", onEnter);
      cancelAnimationFrame(s.raf);
    };
  }, [enabled]);

  if (!enabled) return null;

  return (
    <>
      <div
        ref={outerRef}
        className="pointer-events-none fixed left-0 top-0 rounded-full liquid-glass transition-transform duration-300 ease-out"
        style={{
          width: CURSOR_SIZE.outer,
          height: CURSOR_SIZE.outer,
          transform: "translate(-50%, -50%)",
          zIndex: 9998,
          willChange: "transform",
        }}
      />
      <div
        ref={innerRef}
        className="pointer-events-none fixed left-0 top-0 rounded-full bg-brand"
        style={{
          width: CURSOR_SIZE.inner,
          height: CURSOR_SIZE.inner,
          transform: "translate(-50%, -50%)",
          zIndex: 9999,
          willChange: "transform",
        }}
      />
    </>
  );
}

export default CustomCursor;
