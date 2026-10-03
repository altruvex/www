"use client";

import { gsap } from "@/lib/utils/gsap";
import { useEffect, useRef, type RefObject } from "react";
import { MOTION } from "../tokens";
import { inlineSign, readDirection } from "../utils/direction";
import { whenMotionReady } from "../utils/ready";

/*
 * Scroll-scene hooks: the site's scrubbed, scroll-owned sequences, kept here
 * so their timing, eases and reduced-motion behaviour live in one place.
 * Each hook returns a ref for its root and finds its parts by data
 * attribute, so the markup stays plain and the motion stays swappable.
 *
 * Contract shared by all of them: nothing runs until motion is ready
 * (whenMotionReady), everything is scoped to a gsap.context and reverted on
 * unmount, and under prefers-reduced-motion nothing is set at all — the
 * markup's resting state IS the reduced-motion state, so a hook can never
 * leave content hidden.
 */

function useScene<T extends HTMLElement>(setup: (root: T) => void): RefObject<T | null> {
  const ref = useRef<T | null>(null);

  /* Runs once per mount: a scene's shape is fixed by its config, which the
     hooks below take as constants — changing it mid-life is not supported. */
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

/**
 * Word-by-word read: every `[data-word]` inside the root goes from the
 * scene's `--read-dim` to `--foreground` as the block scrolls through
 * MOTION.scroll.readStart → readEnd. Colour, never opacity — split words at
 * partial alpha overlap and ghost in Arabic (the RTL alpha-ghosting fix).
 * The tween drives `--read` (0 → 1) and globals.css mixes the two inks from
 * it, so the words follow a theme switch instead of keeping a resolved colour.
 * Render the words with `splitWords()`.
 */
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

/**
 * Underline draw: every `[data-draw]` inside the root carries its underline
 * as a one-pixel background (size 100% at rest), drawn from the inline start
 * one after another once the block enters. A background, not a pseudo-element,
 * so a phrase that wraps keeps one continuous line.
 */
export function useUnderlineDraw<T extends HTMLElement = HTMLParagraphElement>() {
  return useScene<T>((root) => {
    gsap.fromTo(
      gsap.utils.toArray<HTMLElement>("[data-draw]", root),
      { backgroundSize: "0% 1px" },
      {
        backgroundSize: "100% 1px",
        duration: MOTION.duration.text,
        ease: MOTION.ease.text,
        stagger: MOTION.stagger.annotate,
        scrollTrigger: { trigger: root, start: MOTION.trigger.latest, once: true },
      },
    );
  });
}

/** A sentence as `[data-word]` spans for useWordRead, spaces kept inside. */
export function splitWords(text: string): Array<{ key: number; word: string }> {
  const words = text.split(" ");
  return words.map((word, i) => ({ key: i, word: i < words.length - 1 ? `${word} ` : word }));
}

/**
 * A large media block that settles: the root opens from a small inset on
 * load (MOTION.duration.settle, gentle ease), and `[data-settle-img]` inside
 * it eases out of a zoom as the block scrolls through the viewport. The clip
 * uses the root's own resolved corner radius — GSAP cannot interpolate var().
 */
export function useMediaSettle<T extends HTMLElement = HTMLDivElement>({
  delay = 0.3,
  open = true,
  zoom = true,
}: {
  delay?: number;
  /** false: skip the load-time inset opening and keep only the scroll zoom
      (for blocks further down the page, which were never "arriving"). */
  open?: boolean;
  /** false: the picture stays at scale 1 — the whole frame is always visible.
      The zoom starts at 1.18, so most of a scroll pass shows a cropped picture;
      pictures that must be seen whole opt out. */
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

/**
 * A kinetic word track on a sticky stage: every `[data-track]` crosses the
 * viewport along the inline axis (mirrored in RTL) as the root scrolls, and
 * an optional `[data-wipe]` layer — a second copy of the track on another
 * ground — rises through them from below, so the words change ink exactly
 * where its edge passes. The root is the tall scroll runway.
 */
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
    /* Durations inside scrubbed timelines are proportions of the scroll
       runway, not seconds — choreography, not the clock. */
    tl.fromTo(tracks, { x: () => sign * window.innerWidth * 0.6 }, { x: () => -sign * travel(), duration: 1 }, 0);
    if (wipe) {
      tl.fromTo(wipe, { clipPath: "inset(100% 0% 0% 0%)" }, { clipPath: "inset(0% 0% 0% 0%)", duration: 0.34 }, wipeAt);
    }
  });
}

/**
 * A picture assembling from its pieces: `[data-tile]` elements start
 * scattered (a seeded scatter, so a refresh never reshuffles them) around
 * `[data-tile-frame]` and settle into place as the root scrolls; an optional
 * `[data-tile-title]` rises out of its mask once the picture is whole.
 */
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
