"use client";

import { FaqSection } from "@/components/sections/faq-section";
import { SectionEndCta } from "@/components/sections/section-end-cta";
import { SectionHeading } from "@/components/sections/section-heading";
import { Container } from "@/components/shared/container";
import { bodyMarks } from "@/components/ui/rich-text";
import {
  useSectionCardGrid,
  useSectionDescription,
  useSectionEyebrow,
  useSectionTitle,
} from "@/lib/motion";
import type { PriceMatrixView, TierView } from "@repo/pricing-schema";
import { localizeNumbers } from "@/lib/utils/number";
import { useLocale, useTranslations } from "next-intl";
import type { ReactNode } from "react";
import { PriceGrid } from "./price-grid";

export default function PricingPage({
  tiers,
  matrix,
  floorLabel,
  ceilingLabel,
}: {
  tiers: readonly TierView[];
  matrix: PriceMatrixView;
  floorLabel: string;
  /** The delivery ceiling, already worded and localized by the schema. */
  ceilingLabel: string;
}) {
  const t = useTranslations("pricing");
  const locale = useLocale();
  const tEnd = useTranslations("common.endCta.pages.pricing");

  const heroEyebrowRef = useSectionEyebrow();
  const heroTitleRef = useSectionTitle<HTMLHeadingElement>();
  const heroDescRef = useSectionDescription<HTMLParagraphElement>();

  const termsEyebrowRef = useSectionEyebrow();
  const termsTitleRef = useSectionTitle<HTMLHeadingElement>();
  const termsRowsRef = useSectionCardGrid<HTMLDListElement>({
    selector: "[data-term]",
  });

  const roiEyebrowRef = useSectionEyebrow();
  const roiTitleRef = useSectionTitle<HTMLHeadingElement>();
  const roiBodyRef = useSectionCardGrid<HTMLDivElement>({ selector: ".roi-p" });

  // One ledger of terms that govern every cell of the grid, so none of them
  // reads as belonging to a single package. The floor is the lowest cell and
  // the window is the ceiling over all of them — both come from the schema.
  const terms: { key: string; label: string; value: ReactNode; figure?: boolean }[] = [
    { key: "floor", label: t("minimumEngagementLabel"), value: floorLabel, figure: true },
    { key: "deliveryWindow", label: t("commercial.items.deliveryWindow.label"), value: ceilingLabel },
    {
      key: "paymentTerms",
      label: t("commercial.items.paymentTerms.label"),
      value: t.rich("commercial.items.paymentTerms.value", bodyMarks),
    },
    { key: "yearOne", label: t("commercial.items.yearOne.label"), value: t("commercial.items.yearOne.value") },
    { key: "exclusions", label: t("commercial.items.exclusions.label"), value: t("commercial.items.exclusions.value") },
    { key: "ownership", label: t("terms.ownershipLabel"), value: t.rich("ownershipNote", bodyMarks) },
  ];

  return (
    <>
      <section
        aria-labelledby="pricing-heading"
        className="accent-world-orange relative pt-(--section-y-top) pb-(--section-y-bottom)"
      >
        <Container>
          <SectionHeading
            titleAs="h1"
            titleId="pricing-heading"
            eyebrowRef={heroEyebrowRef}
            titleRef={heroTitleRef}
            descriptionRef={heroDescRef}
            eyebrow={t("label")}
            firstTitle={t("title", {
              cells: matrix.cellCount,
              cellsLabel: localizeNumbers(String(matrix.cellCount), locale),
            })}
            secondTitle={t("titleItalic", {
              tiers: matrix.tierCount,
              tiersLabel: localizeNumbers(String(matrix.tierCount), locale),
            })}
            description={t("description")}
            className="mt-10 mb-14 md:mt-16 md:mb-20"
            classes={{ description: "lg:max-w-[22rem]" }}
          />
          <PriceGrid matrix={matrix} tiers={tiers} />
        </Container>
      </section>

      <section
        aria-labelledby="pricing-terms-heading"
        className="border-t border-border-subtle pt-(--section-y-top) pb-(--section-y-bottom)"
      >
        <Container>
          <SectionHeading
            titleId="pricing-terms-heading"
            eyebrowRef={termsEyebrowRef}
            titleRef={termsTitleRef}
            eyebrow={t("terms.eyebrow")}
            firstTitle={t("terms.title")}
            secondTitle={t("terms.titleAccent")}
            className="mb-12 md:mb-16"
          />
          {/* One ink rule over the whole set, no rule per term: these read as
              the grid's small print, not as a list of separate offers. */}
          <dl
            ref={termsRowsRef}
            className="grid gap-x-12 gap-y-10 border-t-2 border-foreground pt-10 md:grid-cols-2 md:pt-12 lg:grid-cols-3 lg:gap-y-14"
          >
            {terms.map((term) => (
              <div key={term.key} data-term>
                <dt className="text-base font-medium text-foreground md:text-lg">
                  {term.label}
                </dt>
                <dd
                  className={
                    term.figure
                      ? "mt-3 text-[clamp(1.75rem,2.4vw,2.25rem)] font-light leading-none tracking-[-0.02em] tabular-nums text-foreground rtl:tracking-normal"
                      : "mt-2 max-w-[42ch] whitespace-pre-line text-pretty text-[0.9375rem] leading-relaxed text-muted-foreground md:text-base"
                  }
                >
                  {term.value}
                </dd>
              </div>
            ))}
          </dl>
        </Container>
      </section>

      <section
        aria-labelledby="pricing-roi-heading"
        className="accent-world-orange border-t border-border-subtle pt-(--section-y-top) pb-(--section-y-bottom)"
      >
        <Container className="[&>*]:max-w-[46rem]">
          <SectionHeading
            titleId="pricing-roi-heading"
            eyebrowRef={roiEyebrowRef}
            titleRef={roiTitleRef}
            eyebrow={t("roi.eyebrow")}
            firstTitle={t("roi.title")}
            secondTitle={t("roi.titleItalic")}
            className="mb-10 md:mb-12"
          />
          <div ref={roiBodyRef} className="space-y-6">
            <p className="roi-p text-pretty text-lg leading-[1.65] text-muted-foreground md:text-xl">
              {t.rich("roi.calculation", bodyMarks)}
            </p>
            <p className="roi-p text-pretty text-lg leading-[1.65] text-muted-foreground md:text-xl">
              {t.rich("roi.question", bodyMarks)}
            </p>
          </div>
        </Container>
      </section>

      <FaqSection namespace="pricing.faq" />
      <SectionEndCta
        title={tEnd("title")}
        titleAccent={tEnd("titleAccent")}
        body={tEnd("body")}
        primary="projectRange"
        secondary="technicalCall"
      />
    </>
  );
}
