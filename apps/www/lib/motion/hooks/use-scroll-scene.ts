"use client";

import { gsap } from "@/lib/utils/gsap";
import { useEffect, useRef, type RefObject } from "react";
import { MOTION } from "../tokens";
import { whenMotionReady } from "../utils/ready";

function useScene<T extends HTMLElement>(setup: (root: T) => void): RefObject<T | null> {
  const ref = useRef<T | null>(null);

  useEffect(() => {
    const root = ref.current;
    if (!root) return;
    let ctx: gsap.Context | null = null;
    const off = whenMotionReady(() => {
      ctx = gsap.context(() => {
        gsap.matchMedia().add("(prefers-reduced-motion: no-preference)", () => setup(root));
      }, root);
    });
    return () => {
      off();
      ctx?.revert();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return ref;
}

export function useWordRead<T extends HTMLElement = HTMLParagraphElement>() {
  return useScene<T>((root) => {
    gsap.fromTo(
      gsap.utils.toArray<HTMLElement>("[data-word]", root),
      { "--read": 0 },
      {
        "--read": 1,
        ease: "none",
        stagger: MOTION.stagger.word,
        scrollTrigger: { trigger: root, start: MOTION.scroll.readStart, end: MOTION.scroll.readEnd, scrub: true },
      },
    );
  });
}

export function splitWords(text: string): Array<{ key: number; word: string }> {
  const words = text.split(" ");
  return words.map((word, i) => ({ key: i, word: i < words.length - 1 ? `${word} ` : word }));
}

export function useMediaSettle<T extends HTMLElement = HTMLDivElement>({
  delay = 0.3,
  open = true,
  zoom = true,
}: {
  delay?: number;
  open?: boolean;
  zoom?: boolean;
} = {}) {
  return useScene<T>((root) => {
    if (open) {
      const radius = getComputedStyle(root).borderTopLeftRadius;
      gsap.fromTo(
        root,
        { clipPath: `inset(6% 4% 6% 4% round ${radius})` },
        { clipPath: `inset(0% 0% 0% 0% round ${radius})`, duration: MOTION.duration.settle, ease: MOTION.ease.gentle, delay },
      );
    }
    const img = zoom ? root.querySelector<HTMLElement>("[data-settle-img]") : null;
    if (img) {
      gsap.fromTo(
        img,
        { scale: 1.18 },
        { scale: 1, ease: "none", scrollTrigger: { trigger: root, start: "top bottom", end: "bottom top", scrub: true } },
      );
    }
  });
}
