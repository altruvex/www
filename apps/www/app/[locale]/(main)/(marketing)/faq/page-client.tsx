"use client";

import { useFillPricingTokens } from "@/components/providers/pricing-tokens-provider";
import { PageHero } from "@/components/sections/page-hero";
import { SectionEndCta } from "@/components/sections/section-end-cta";
import { Container } from "@/components/shared/container";
import { ContentsRail } from "@/components/shared/contents-rail";
import { FaqList, type FaqListItem } from "@/components/shared/faq-list";
import { Num } from "@/components/ui/num";
import { useTranslations } from "next-intl";

type FaqQuestion = { question: string; answer: string };

/**
 * Topic order and membership. Kept in code rather than in the message files
 * because it is structure, not copy — and because the question keys are
 * numeric strings, which JavaScript orders "10".."14" ahead of "01" when the
 * object is iterated, so reading them with Object.values scrambled the page.
 * A key missing from a locale is skipped, never rendered empty.
 */
const FAQ_GROUPS = [
  { id: "ownership", keys: ["01", "02", "09", "14"] },
  { id: "pricing", keys: ["11", "10", "12", "08"] },
  { id: "delivery", keys: ["04", "05", "13"] },
  { id: "engineering", keys: ["03", "07", "06"] },
] as const;

export default function FAQPageClient() {
  const t = useTranslations("faq");
  const tEnd = useTranslations("common.endCta.pages.faq");
  // FAQ prose quotes prices and the post-launch warranty window as {token}s,
  // filled from the resolved pricing so an answer cannot state a figure that
  // /pricing no longer charges — or a warranty the contract no longer grants.
  // Questions carry them too: one of them names the warranty window.
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

  // Numbering runs on across topics, so "07" names one question page-wide.
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
        minHeightClass="min-h-[60vh]"
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
              {groups.map((group, index) => (
                <section
                  key={group.id}
                  id={group.id}
                  tabIndex={-1}
                  aria-labelledby={`${group.id}-title`}
                  className="scroll-mt-28 outline-none"
                >
                  <div className="mb-6 flex items-baseline gap-4 md:mb-8">
                    <span
                      aria-hidden
                      className="text-sm tabular-nums text-local-accent-text ltr:font-mono"
                    >
                      <Num value={index + 1} pad={2} />
                    </span>
                    <h2
                      id={`${group.id}-title`}
                      className="text-[clamp(1.5rem,2.2vw,2rem)] font-normal leading-tight tracking-[-0.015em] text-foreground"
                    >
                      {group.title}
                    </h2>
                  </div>
                  <FaqList items={group.items} startIndex={group.startIndex} />
                </section>
              ))}
            </div>
          </div>
        </Container>
      </section>

      {/* Someone who reached the end of the FAQ did not find their question,
          so the close asks for it rather than for a build. */}
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
