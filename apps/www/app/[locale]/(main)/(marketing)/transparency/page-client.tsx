"use client";

import { usePricingTokens } from "@/components/providers/pricing-tokens-provider";
import { SectionEndCta } from "@/components/sections/section-end-cta";
import { TransparencyChapter } from "@/components/sections/transparency-chapter";
import { TransparencyEstimator } from "@/components/sections/transparency-estimator";
import { TransparencyMeasuresDetailsSection } from "@/components/sections/transparency-measures-details-section";
import { Container } from "@/components/shared/container";
import { DirectionalLink } from "@/components/shared/directional-link";
import { FaqList } from "@/components/shared/faq-list";
import { bodyMarks } from "@/components/ui/rich-text";
import type { ProjectType } from "@/hooks/use-transparency";
import type { EstimatorPricing } from "@/components/sections/transparency-estimator/span";
import {
  scrollToY,
  useSectionDescription,
  useSectionElement,
} from "@/lib/motion";
import { getCommercialCta } from "@/lib/config/commercial";
import { useTranslations } from "next-intl";
import { useSearchParams } from "next/navigation";
import type { MouseEvent } from "react";

const PROJECT_TYPES = ["website", "webapp", "ecommerce", "pwa"] as const;

export default function TransparencyPageClient({
  pricing,
}: {
  pricing: EstimatorPricing;
}) {
  const searchParams = useSearchParams();

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

      <TransparencyMeasuresDetailsSection />

      <TransparencyFaqSection />

      <TransparencyEndCta />
    </>
  );
}

// The visitor who has a range asks for the proposal from the result panel,
// where their answers travel with the request. The primary scrolls there
// (Lenis owns the scroll, so the hash jump is done by hand) — or to the top
// of the estimator while the result is not on screen yet.
function goToEstimate(event: MouseEvent<HTMLDivElement>) {
  const link = (event.target as HTMLElement).closest("a");
  if (!link || !link.hash) return;
  const target =
    document.getElementById(RESULT_HEADING_ID) ??
    document.getElementById(ESTIMATOR_ID);
  if (!target) return;
  event.preventDefault();
  scrollToY(
    target.getBoundingClientRect().top +
      window.scrollY -
      parseFloat(getComputedStyle(target).scrollMarginTop || "0"),
  );
}

const RESULT_HEADING_ID = "estimate-result-heading";
const ESTIMATOR_ID = "transparency-estimator";

function TransparencyEndCta() {
  const t = useTranslations("transparency.close");
  const tPM = useTranslations("pricingModel.result");

  return (
    <div onClickCapture={goToEstimate}>
      <SectionEndCta
        title={t("title")}
        titleAccent={t("titleAccent")}
        body={t("body")}
        primary={{
          href: `${getCommercialCta("projectRange").href}#${RESULT_HEADING_ID}`,
          label: tPM("requestProposal"),
        }}
        secondary="technicalCall"
      />
    </div>
  );
}

function TransparencyFaqSection() {
  const t = useTranslations("transparency");
  const tFaq = useTranslations("faq");
  const tCTAs = useTranslations("commercial.ctas");
  const { vatRate, warrantyDays } = usePricingTokens();

  const noteRef = useSectionElement<HTMLDivElement>();
  const listRef = useSectionDescription<HTMLDivElement>();

  const items = ["1", "2", "3", "4", "5", "6"].map((key) => ({
    id: key,
    question: t(`faq.q${key}`),
    answer: t.rich(`faq.a${key}`, {
      ...bodyMarks,
      vatRate,
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

        <div className="mt-(--heading-gap) grid gap-10 lg:grid-cols-12 lg:gap-x-16">
          <div
            ref={noteRef}
            className="lg:sticky lg:top-28 lg:col-span-3 lg:self-start"
          >
            <p className="max-w-[32ch] text-base leading-relaxed text-muted-foreground">
              {t("faq.more")}
            </p>
            <DirectionalLink
              href={getCommercialCta("scopeProjects").href}
              className="mt-4 inline-flex min-h-6 items-center text-sm text-foreground underline decoration-border underline-offset-4 transition-colors hover:text-local-accent-text hover:decoration-local-accent-text pointer-coarse:min-h-11"
            >
              {tCTAs("scopeProjects")}
            </DirectionalLink>
            <DirectionalLink
              href="/faq"
              className="mt-2 flex min-h-6 w-fit items-center text-sm text-foreground underline decoration-border underline-offset-4 transition-colors hover:text-local-accent-text hover:decoration-local-accent-text pointer-coarse:min-h-11"
            >
              {tFaq("allQuestions")}
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
