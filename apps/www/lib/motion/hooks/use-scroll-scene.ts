"use client";

import { gsap } from "@/lib/utils/gsap";
import { useEffect, useRef, type RefObject } from "react";
import { MOTION } from "../tokens";
import { inlineSign, readDirection } from "../utils/direction";
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

export function useKineticTrack<T extends HTMLElement = HTMLElement>({ wipeAt = 0.6 }: { wipeAt?: number } = {}) {
  return useScene<T>((root) => {
    const sign = inlineSign(readDirection(root));
    const tracks = gsap.utils.toArray<HTMLElement>("[data-track]", root);
    const wipe = root.querySelector<HTMLElement>("[data-wipe]");
    const travel = () => (tracks[0]?.scrollWidth ?? 0) - window.innerWidth * 0.4;
    const tl = gsap.timeline({
      defaults: { ease: "none" },
      scrollTrigger: {
        trigger: root,
        start: "top top",
        end: "bottom bottom",
        scrub: MOTION.scroll.scrub.track,
        invalidateOnRefresh: true,
      },
    });
    tl.fromTo(tracks, { x: () => sign * window.innerWidth * 0.6 }, { x: () => -sign * travel(), duration: 1 }, 0);
    if (wipe) {
      tl.fromTo(wipe, { clipPath: "inset(100% 0% 0% 0%)" }, { clipPath: "inset(0% 0% 0% 0%)", duration: 0.34 }, wipeAt);
    }
  });
}

export function useTileAssemble<T extends HTMLElement = HTMLElement>() {
  return useScene<T>((root) => {
    const tiles = gsap.utils.toArray<HTMLElement>("[data-tile]", root);
    const frame = root.querySelector<HTMLElement>("[data-tile-frame]");
    const title = root.querySelector<HTMLElement>("[data-tile-title]");
    const spread = () => (frame?.offsetWidth ?? 800) * 0.45;
    const tl = gsap.timeline({
      scrollTrigger: {
        trigger: root,
        start: "top top",
        end: "bottom bottom",
        scrub: MOTION.scroll.scrub.assemble,
        invalidateOnRefresh: true,
      },
    });
    const rand = gsap.utils.random(-1, 1, 0.001, true);
    tiles.forEach((tile, i) => {
      tl.fromTo(
        tile,
        {
          x: () => rand() * spread(),
          y: () => rand() * spread() * 0.6,
          rotate: rand() * 24,
          scale: 0.55 + Math.abs(rand()) * 0.35,
          autoAlpha: 0,
        },
        { x: 0, y: 0, rotate: 0, scale: 1, autoAlpha: 1, ease: MOTION.ease.smooth, duration: 0.7 },
        (i % 7) * 0.035,
      );
    });
    if (title) tl.fromTo(title, { yPercent: 110 }, { yPercent: 0, ease: MOTION.ease.text, duration: 0.2 }, 0.82);
  });
}
