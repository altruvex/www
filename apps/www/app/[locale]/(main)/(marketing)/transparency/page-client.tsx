"use client";

import { usePricingTokens } from "@/components/providers/pricing-tokens-provider";
import { TransparencyChapter } from "@/components/sections/transparency-chapter";
import { TransparencyEstimator } from "@/components/sections/transparency-estimator";
import { TransparencyMeasuresDetailsSection } from "@/components/sections/transparency-measures-details-section";
import { Container } from "@/components/shared/container";
import { DirectionalLink } from "@/components/shared/directional-link";
import { FaqList } from "@/components/shared/faq-list";
import { bodyMarks } from "@/components/ui/rich-text";
import type { ProjectType } from "@/hooks/use-transparency";
import type { EstimatorPricing } from "@/components/sections/transparency-estimator/span";
import { useSectionDescription, useSectionElement } from "@/lib/motion";
import { getCommercialCta } from "@/lib/config/commercial";
import { useTranslations } from "next-intl";
import { useSearchParams } from "next/navigation";

const PROJECT_TYPES = ["website", "webapp", "ecommerce", "pwa"] as const;

export default function TransparencyPageClient({
  pricing,
}: {
  pricing: EstimatorPricing;
}) {
  const searchParams = useSearchParams();

  // `?tier=` from old links is ignored on purpose: tiers no longer exist, and
  // a stale token must not preselect a band the visitor never chose.
  const rawProjectType = searchParams.get("projectType") ?? "";

  const initialProjectType = (
    PROJECT_TYPES.includes(
      rawProjectType as (typeof PROJECT_TYPES)[number],
    )
      ? rawProjectType
      : null
  ) as ProjectType;

  return (
    <>
      <TransparencyEstimator
        pageHeading
        pricing={pricing}
        initialProjectType={initialProjectType}
      />

      {/* The figure first, then how it is reached, then the questions a
          reader still has. */}
      <TransparencyMeasuresDetailsSection />

      <TransparencyFaqSection />
    </>
  );
}

function TransparencyFaqSection() {
  const t = useTranslations("transparency");
  const tFaq = useTranslations("faq");
  const tCTAs = useTranslations("commercial.ctas");
  const { warrantyDays } = usePricingTokens();

  const noteRef = useSectionElement<HTMLDivElement>();
  const listRef = useSectionDescription<HTMLDivElement>();

  // Same FAQ device as /faq and every other page: one collapsing list, so a
  // visitor who has opened a question anywhere on the site knows this one.
  // The chapter header stays, because this page is read as numbered chapters.
  const items = ["1", "2", "3", "4"].map((key) => ({
    id: key,
    question: t(`faq.q${key}`),
    answer: t.rich(`faq.a${key}`, {
      ...bodyMarks,
      warrantyDays,
    }),
  }));

  return (
    <section
      aria-labelledby="transparency-faq-heading"
      className="border-t border-border-subtle pt-(--section-y-top) pb-(--section-y-bottom)"
    >
      <Container>
        <TransparencyChapter
          index={2}
          titleId="transparency-faq-heading"
          eyebrow={t("faq.title")}
          title={t("faq.subtitle")}
        />

        <div className="mt-12 grid gap-10 lg:mt-16 lg:grid-cols-12 lg:gap-x-16">
          <div
            ref={noteRef}
            className="lg:sticky lg:top-28 lg:col-span-3 lg:self-start"
          >
            <p className="max-w-[32ch] text-[0.9375rem] leading-relaxed text-muted-foreground">
              {t("faq.more")}
            </p>
            <DirectionalLink
              href="/faq"
              className="mt-4 inline-flex min-h-6 items-center text-sm text-foreground underline decoration-border underline-offset-4 transition-colors hover:text-local-accent-text hover:decoration-local-accent-text pointer-coarse:min-h-11"
            >
              {tFaq("allQuestions")}
            </DirectionalLink>
            {/* The estimator above is this page's conversion; this is the way
                out for a visitor who read to the end and would rather talk. */}
            <DirectionalLink
              href={getCommercialCta("technicalCall").href}
              className="mt-2 flex min-h-6 w-fit items-center text-sm text-foreground underline decoration-border underline-offset-4 transition-colors hover:text-local-accent-text hover:decoration-local-accent-text pointer-coarse:min-h-11"
            >
              {tCTAs("technicalCall")}
            </DirectionalLink>
          </div>

          <div
            ref={listRef}
            className="lg:col-span-8 lg:col-start-5"
          >
            <FaqList items={items} />
          </div>
        </div>
      </Container>
    </section>
  );
}
