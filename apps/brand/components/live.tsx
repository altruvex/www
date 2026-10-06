"use client";

import { useEffect, useState } from "react";

const EVENT = "brand-theme";

/** Tells every live reading on the page to measure again (theme, scene, world or dir changed). */
export function announceChange(): void {
  // After the class change has been applied and styles recalculated.
  requestAnimationFrame(() => window.dispatchEvent(new Event(EVENT)));
}

/** A counter that changes whenever computed styles may have changed. */
export function useStyleEpoch(): number {
  const [epoch, setEpoch] = useState(0);
  useEffect(() => {
    const bump = (): void => setEpoch((n) => n + 1);
    window.addEventListener(EVENT, bump);
    window.addEventListener("resize", bump);
    // Fonts load with display: optional; measure again once they settle.
    void document.fonts?.ready.then(bump);
    return () => {
      window.removeEventListener(EVENT, bump);
      window.removeEventListener("resize", bump);
    };
  }, []);
  return epoch;
}
