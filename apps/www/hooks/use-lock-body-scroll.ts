"use client";

import { getLenis } from "@/lib/motion/lenis-instance";
import { useLayoutEffect } from "react";

let lockCount = 0;
let release: (() => void) | null = null;

function lock(): void {
  const body = document.body;
  const previousOverflow = body.style.overflow;
  const previousPadding = body.style.paddingInlineEnd;

  const gutter = window.innerWidth - document.documentElement.clientWidth;

  body.style.overflow = "hidden";
  if (gutter > 0) body.style.paddingInlineEnd = `${gutter}px`;

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
