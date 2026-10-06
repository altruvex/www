"use client";

import { useFillPricingTokens } from "@/components/providers/pricing-tokens-provider";
import { useTranslations } from "next-intl";
import { FaqSectionView } from "./faq-section";

type FaqEntry = { question?: string; answer?: string };

/**
 * The homepage answers the five questions a buyer asks before booking a call:
 * custom vs platform, timeline, bilingual build, handover to another developer,
 * and how payment works. Answers come from the shared `faq` namespace so the
 * homepage and /faq can never say different things; only the section title is
 * the homepage's own (`commercial.homeFaq.title`).
 */
const HOME_QUESTION_KEYS = ["03", "04", "11", "09", "07"] as const;

export function HomeFaqSection() {
  const t = useTranslations("faq");
  const tHome = useTranslations("commercial.homeFaq");
  const fillTokens = useFillPricingTokens();
  const questions = t.raw("questions") as Record<string, FaqEntry>;

  const items = HOME_QUESTION_KEYS.flatMap((key) => {
    const entry = questions?.[key];
    if (!entry?.question || !entry.answer) return [];
    return [
      {
        id: key,
        question: fillTokens(entry.question),
        answer: fillTokens(entry.answer),
      },
    ];
  });

  if (items.length === 0) return null;

  return (
    <FaqSectionView eyebrow={t("eyebrow")} title={tHome("title")} items={items} />
  );
}
