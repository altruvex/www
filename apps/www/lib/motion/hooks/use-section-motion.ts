"use client";

import { motion } from "../utils/presets";
import type { BatchConfig } from "./use-batch";
import { useBatch } from "./use-batch";
import type { RevealConfig } from "./use-reveal";
import { useReveal } from "./use-reveal";
import type { TextConfig } from "./use-text";
import { useText } from "./use-text";

export function useSectionTitle<T extends HTMLElement = HTMLHeadingElement>(
  config?: Partial<TextConfig>,
) {
  return useText<T>(motion.sectionTitle(config));
}

export function useSectionEyebrow<T extends HTMLElement = HTMLParagraphElement>(
  config?: Partial<RevealConfig>,
) {
  return useReveal<T>(motion.sectionEyebrow(config));
}

export function useSectionDescription<T extends HTMLElement = HTMLDivElement>(
  config?: Partial<RevealConfig>,
) {
  return useReveal<T>(motion.sectionDescription(config));
}

export function useSectionElement<T extends HTMLElement = HTMLDivElement>(
  config?: Partial<RevealConfig>,
) {
  return useReveal<T>(motion.sectionElement(config));
}

export function useSectionScrollHint<T extends HTMLElement = HTMLDivElement>(
  config?: Partial<RevealConfig>,
) {
  return useReveal<T>(motion.sectionScrollHint(config));
}

export function useSectionCardGrid<T extends HTMLElement = HTMLDivElement>(
  config?: Partial<BatchConfig>,
) {
  return useBatch<T>(motion.sectionCardGrid(config));
}
