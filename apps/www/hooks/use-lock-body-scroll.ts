"use client";

import { getLenis } from "@/lib/motion/lenis-instance";
import { useLayoutEffect } from "react";

/**
 * Reference-counted so overlapping locks (nav drawer + command palette) can't
 * restore the page early or fight over the same inline styles.
 */
let lockCount = 0;
let release: (() => void) | null = null;

function lock(): void {
  const body = document.body;
  const previousOverflow = body.style.overflow;
  const previousPadding = body.style.paddingInlineEnd;

  // Reserve the classic scrollbar's width so hiding it doesn't reflow the page
  // sideways underneath the overlay.
  const gutter = window.innerWidth - document.documentElement.clientWidth;

  body.style.overflow = "hidden";
  if (gutter > 0) body.style.paddingInlineEnd = `${gutter}px`;

  // Lenis scrolls from its own rAF loop and ignores `overflow: hidden`, so the
  // page keeps moving behind a "locked" overlay unless Lenis is stopped too.
  getLenis()?.stop();

  release = () => {
    body.style.overflow = previousOverflow;
    body.style.paddingInlineEnd = previousPadding;
    getLenis()?.start();
  };
}

export function useLockBodyScroll(locked: boolean = true) {
  useLayoutEffect(() => {
    if (!locked) return;

    if (lockCount === 0) lock();
    lockCount += 1;

    return () => {
      lockCount -= 1;
      if (lockCount === 0) {
        release?.();
        release = null;
      }
    };
  }, [locked]);
}
