"use client";

import { useEffect, useState } from "react";

interface UseExitIntentOptions {
  threshold?: number;
  cooldown?: number;
  maxDisplays?: number;
}

export const useExitIntent = (
  onExit: () => void,
  options: UseExitIntentOptions = {},
) => {
  const {
    threshold = 10,
    cooldown = 24 * 60 * 60 * 1000,
    maxDisplays = 3,
  } = options;
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setIsReady(true), 2000);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!isReady || typeof window === "undefined") return;

    const handleMouseLeave = (e: MouseEvent) => {
      if (e.clientY < threshold) {
        const lastShown = sessionStorage.getItem("exitIntentLastShown");
        const displayCount = parseInt(
          sessionStorage.getItem("exitIntentCount") || "0",
        );

        const now = Date.now();

        if (displayCount >= maxDisplays) return;
        if (lastShown && now - parseInt(lastShown) < cooldown) return;

        if (sessionStorage.getItem("hasConverted")) return;

        onExit();
        sessionStorage.setItem("exitIntentLastShown", now.toString());
        sessionStorage.setItem(
          "exitIntentCount",
          (displayCount + 1).toString(),
        );
      }
    };

    document.addEventListener("mouseleave", handleMouseLeave);
    return () => document.removeEventListener("mouseleave", handleMouseLeave);
  }, [isReady, onExit, threshold, cooldown, maxDisplays]);
};

export const markAsConverted = () => {
  if (typeof window !== "undefined") {
    sessionStorage.setItem("hasConverted", "true");
  }
};
