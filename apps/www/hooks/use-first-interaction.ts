"use client";

import { useEffect, useState } from "react";

const INTERACTION_EVENTS: Array<keyof WindowEventMap> = [
  "pointerdown",
  "keydown",
  "touchstart",
  "wheel",
];

export function useFirstInteraction() {
  const [hasInteracted, setHasInteracted] = useState(false);

  useEffect(() => {
    if (hasInteracted) return;

    const onInteraction = () => setHasInteracted(true);
    const options: AddEventListenerOptions = { once: true, passive: true };

    INTERACTION_EVENTS.forEach((eventName) => {
      window.addEventListener(eventName, onInteraction, options);
    });


    return () => {
      INTERACTION_EVENTS.forEach((eventName) => {
        window.removeEventListener(eventName, onInteraction);
      });
    };
  }, [hasInteracted]);

  return hasInteracted;
}
