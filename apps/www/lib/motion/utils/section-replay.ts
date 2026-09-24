/**
 * Replays the section-heading choreography on demand.
 *
 * `<SectionHeading>` animates through three hooks — `useSectionEyebrow`,
 * `useSectionTitle`, `useSectionDescription` (+ `useSectionElement` for what
 * follows) — each firing once as it scrolls in. A surface that swaps one
 * heading for another in place (a stage whose copy changes with scroll) needs
 * that same entrance again on every swap. This plays it from the very same
 * presets, through the very same cores the hooks use, so a replayed heading
 * is indistinguishable from one arriving on scroll.
 *
 * Full-motion tier only; callers own reduced motion (`REDUCED_FADE`).
 */
import { playRevealEnter, revealShape } from "../hooks/use-reveal";
import { textShape } from "../hooks/use-text";
import { MOTION } from "../tokens";
import { motion } from "./presets";
import { playTextEnter } from "./text-enter";

interface SectionHeadingParts {
  eyebrow?: HTMLElement | null;
  title?: HTMLElement | null;
  description?: HTMLElement | null;
  /** Blocks after the heading, revealed on the `sectionElement` beat in order. */
  elements?: ReadonlyArray<HTMLElement>;
}

export function playSectionHeading({
  eyebrow,
  title,
  description,
  elements = [],
}: SectionHeadingParts): void {
  if (eyebrow) playRevealEnter(eyebrow, revealShape(motion.sectionEyebrow()));

  if (title) {
    const { shape, splitBy } = textShape(motion.sectionTitle());
    playTextEnter(title, shape, splitBy);
  }

  if (description) {
    playRevealEnter(description, revealShape(motion.sectionDescription()));
  }

  elements.forEach((element, index) => {
    playRevealEnter(
      element,
      revealShape(
        motion.sectionElement({
          delay: MOTION.section.element + index * MOTION.stagger.loose,
        }),
      ),
    );
  });
}
