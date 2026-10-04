"use client";

import { useFillPricingTokens } from "@/components/providers/pricing-tokens-provider";
import { PageHero } from "@/components/sections/page-hero";
import { SectionEndCta } from "@/components/sections/section-end-cta";
import { Container } from "@/components/shared/container";
import { ContentsRail } from "@/components/shared/contents-rail";
import { FaqList, type FaqListItem } from "@/components/shared/faq-list";
import { useTranslations } from "next-intl";

type FaqQuestion = { question: string; answer: string };

const FAQ_GROUPS = [
  { id: "ownership", keys: ["01", "02", "09", "14"] },
  { id: "pricing", keys: ["11", "10", "12", "08"] },
  { id: "delivery", keys: ["04", "05", "13"] },
  { id: "engineering", keys: ["03", "07", "06"] },
] as const;

export default function FAQPageClient() {
  const t = useTranslations("faq");
  const tEnd = useTranslations("common.endCta.pages.faq");
  const fillTokens = useFillPricingTokens();
  const questions = t.raw("questions") as Record<string, FaqQuestion>;

  const filled = FAQ_GROUPS.map((group) => ({
    id: `faq-${group.id}`,
    title: t(`groups.${group.id}`),
    items: group.keys.flatMap((key): FaqListItem[] => {
      const entry = questions[key];
      if (!entry) return [];
      return [
        {
          id: key,
          question: fillTokens(entry.question),
          answer: fillTokens(entry.answer),
        },
      ];
    }),
  })).filter((group) => group.items.length > 0);

  const groups = filled.map((group, index) => ({
    ...group,
    startIndex:
      1 +
      filled.slice(0, index).reduce((sum, prev) => sum + prev.items.length, 0),
  }));

  return (
    <>
      <PageHero
        eyebrow={t("eyebrow")}
        title={t("title")}
        description={t("subtitle")}
      />

      <section
        aria-label={t("title")}
        className="accent-world-blue border-t border-border-subtle pt-(--section-y-top) pb-(--section-y-bottom)"
      >
        <Container>
          <div className="grid gap-10 lg:grid-cols-[15rem_minmax(0,1fr)] lg:gap-20 xl:grid-cols-[17rem_minmax(0,1fr)]">
            <ContentsRail
              title={t("contents")}
              items={groups.map((group) => ({
                id: group.id,
                label: group.title,
                count: group.items.length,
              }))}
            />

            <div className="max-w-4xl space-y-20 md:space-y-24">
              {groups.map((group) => (
                <section
                  key={group.id}
                  id={group.id}
                  tabIndex={-1}
                  aria-labelledby={`${group.id}-title`}
                  className="scroll-mt-28 outline-none"
                >
                  <h2
                    id={`${group.id}-title`}
                    className="mb-6 text-[clamp(1.5rem,2.2vw,2rem)] font-normal leading-tight tracking-[-0.015em] text-foreground md:mb-8"
                  >
                    {group.title}
                  </h2>
                  <FaqList items={group.items} startIndex={group.startIndex} />
                </section>
              ))}
            </div>
          </div>
        </Container>
      </section>

      <SectionEndCta
        eyebrow={tEnd("eyebrow")}
        title={tEnd("title")}
        titleAccent={tEnd("titleAccent")}
        body={tEnd("body")}
        primary="describeTheBuild"
        secondary="technicalCall"
      />
    </>
  );
}
