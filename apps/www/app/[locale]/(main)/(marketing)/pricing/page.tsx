import { FaqSection } from "@/components/sections/faq-section";
import { CommercialTerms } from "@/components/sections/pricing-model/commercial-terms";
import {
  CostSplit,
  type CostSplitData,
} from "@/components/sections/pricing-model/cost-split";
import {
  PricingSpine,
  type SpineStage,
} from "@/components/sections/pricing-model/pricing-spine";
import { ModelSectionHead } from "@/components/sections/pricing-model/section-head";
import { ServiceInvestmentRegister } from "@/components/sections/pricing-model/service-investment-register";
import { SECTION_TITLE } from "@/components/sections/pricing-model/type";
import { SectionEndCta } from "@/components/sections/section-end-cta";
import { JsonLd } from "@/components/seo/json-ld";
import { Container } from "@/components/shared/container";
import { generateRouteMetadata, type RouteMetaKey } from "@/lib/metadata";
import {
  buildFaqPageSchemas,
  buildPageSchemas,
  buildPricingOfferSchemas,
} from "@/lib/schema";
import { getPublicPricing } from "@/lib/server/pricing";
import {
  estimateSpanLabels,
  formatRange,
  paymentScheduleView,
  pricingDriverViews,
  pricingTokens,
  publishedBuildRangeLabel,
  serviceInvestmentViews,
  termsView,
  workedExampleView,
  type Locale,
  type ResolvedPricing,
  type ServiceInvestmentRowView,
} from "@repo/pricing-schema";
import { getTranslations } from "next-intl/server";
import { cn } from "@/lib/utils/utils";
import type { ReactNode } from "react";
import PricingHero from "./page-client";

const metaKey: RouteMetaKey = "pricing";
const pathSuffix = "/pricing";
export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  return generateRouteMetadata(locale, metaKey, pathSuffix);
}

function serviceRange(
  pricing: ResolvedPricing,
  serviceId: keyof ResolvedPricing["services"],
  locale: Locale,
) {
  const cells = Object.values(pricing.services[serviceId].price);
  return formatRange(
    {
      min: Math.min(...cells.map((cell) => cell.min)),
      max: Math.max(...cells.map((cell) => cell.max)),
    },
    locale,
  );
}

function offerEntries(
  rows: readonly ServiceInvestmentRowView[],
  buildRange: string,
) {
  return rows.map((row) => ({
    name: row.name,
    description: row.covers,
    price: row.id === "development" ? buildRange : row.figureLabel,
    features:
      row.matrix?.rows.map((matrixRow) => matrixRow.name) ??
      row.plans?.map((plan) => plan.name) ??
      (row.audit ? [...row.audit.deliverables] : []),
  }));
}

function ModelSection({
  id,
  index,
  title,
  lead,
  ground = "plain",
  opening = "none",
  children,
}: {
  id: string;
  index: number;
  title: string;
  lead: string;
  ground?: "plain" | "band";
  opening?: "none" | "rule";
  children: ReactNode;
}) {
  const headingId = `${id}-heading`;
  return (
    <section
      id={id}
      aria-labelledby={headingId}
      className={cn(
        "scroll-mt-24 pt-(--section-y-top) pb-(--section-y-bottom)",
        ground === "band" && "bg-surface",
      )}
    >
      <Container>
        {opening === "rule" ? (
          <div aria-hidden className="mb-(--heading-gap) border-t-2 border-foreground" />
        ) : null}
        <ModelSectionHead index={index} id={headingId} title={title} lead={lead} />
        {children}
      </Container>
    </section>
  );
}

const PRICING_RHYTHM =
  "[--section-y-top:clamp(9rem,min(20vh,14vw),15rem)] [--section-y-bottom:clamp(9rem,min(20vh,14vw),15rem)] [--heading-gap:clamp(5.5rem,min(12vh,8.4vw),9.5rem)] [--section-block:clamp(7.5rem,min(16vh,11.2vw),11.5rem)] max-[759px]:[--section-y-top:6.5rem] max-[759px]:[--section-y-bottom:6.5rem] max-[759px]:[--heading-gap:3.5rem] max-[759px]:[--section-block:5rem]";

export default async function PricingPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const lc = locale as Locale;
  const t = await getTranslations({ locale, namespace: "pricing" });
  const tm = await getTranslations({ locale, namespace: "pricingModel" });
  const faqEntries = Object.values(
    t.raw("faq.questions") as Record<string, { a: string; q: string }>,
  ).map((entry) => ({
    answer: entry.a,
    question: entry.q,
  }));

  const pricing = await getPublicPricing();
  const rows = serviceInvestmentViews(lc, pricing);
  const matrix = rows.find((row) => row.id === "development")?.matrix ?? null;
  const plans = rows.find((row) => row.id === "maintenance")?.plans ?? [];
  const example = workedExampleView(lc, pricing);
  const span = estimateSpanLabels(lc, pricing);
  const tokens = pricingTokens(lc, pricing);

  const stages: SpineStage[] = [
    {
      id: "requirements",
      name: tm("stages.requirements.name"),
      does: tm("stages.requirements.does"),
      cap: tm("stages.requirements.cap"),
      figure: tm("stages.requirements.figure"),
      kind: "unknown",
      was: null,
    },
    {
      id: "scope",
      name: tm("stages.scope.name"),
      does: tm("stages.scope.does"),
      cap: tm("stages.scope.cap"),
      figure: example.floorLabel,
      kind: "range",
      was: null,
    },
    {
      id: "complexity",
      name: tm("stages.complexity.name"),
      does: tm("stages.complexity.does"),
      cap: tm("stages.complexity.cap"),
      figure: example.cellLabel,
      kind: "range",
      was: span.priceLabel,
    },
    {
      id: "estimate",
      name: tm("stages.estimate.name"),
      does: tm("stages.estimate.does"),
      cap: tm("stages.estimate.cap", { weeks: example.weeksLabel }),
      figure: example.estimateLabel,
      kind: "estimate",
      was: null,
    },
    {
      id: "proposal",
      name: tm("stages.proposal.name"),
      does: tm("stages.proposal.does", { days: example.validityDaysLabel }),
      cap: tm("stages.proposal.cap"),
      figure: tm("stages.proposal.figure"),
      kind: "proposal",
      was: example.estimateLabel,
    },
  ];

  const exampleRow = matrix?.rows.find(
    (row) => row.serviceId === example.input.serviceId,
  );
  const split: CostSplitData = {
    drivers: pricingDriverViews(lc),
    openingRange: span.priceLabel,
    floorLabel: example.floorLabel,
    serviceRanges:
      matrix?.rows.map((row) => ({
        serviceId: row.serviceId,
        name: row.name,
        range: serviceRange(pricing, row.serviceId, lc),
      })) ?? [],
    exampleService: {
      name: exampleRow?.name ?? example.serviceLabel,
      cells:
        exampleRow?.cells.map((cell, index) => ({
          band: matrix?.bands[index]?.label ?? cell.complexityId,
          price: cell.priceLabel,
        })) ?? [],
    },
    plans,
  };

  return (
    <>
      <JsonLd
        schemas={[
          ...buildPageSchemas(locale, metaKey),
          ...buildFaqPageSchemas(faqEntries, locale, pricing),
          ...buildPricingOfferSchemas(
            locale,
            offerEntries(rows, publishedBuildRangeLabel(lc, pricing)),
          ),
        ]}
      />
      <div className={PRICING_RHYTHM}>
      <PricingHero floorLabel={example.floorLabel} />
      <ModelSection
        id="how"
        index={1}
        ground="band"
        title={tm("sections.how.title")}
        lead={tm("sections.how.lead")}
      >
        <PricingSpine
          stages={stages}
          wasLabel={tm("spine.was")}
          exampleLine={tm("example.line", {
            service: example.serviceLabel,
            band: example.bandLabel,
            brand: example.brandLabel,
            content: example.contentLabel,
            timeline: example.timelineLabel,
          })}
        />
      </ModelSection>
      <ModelSection
        id="cost"
        index={2}
        title={tm("sections.cost.title")}
        lead={tm("sections.cost.lead")}
      >
        <CostSplit locale={locale} data={split} />
      </ModelSection>
      <ModelSection
        id="investment"
        index={3}
        opening="rule"
        title={tm("sections.invest.title")}
        lead={tm("sections.invest.lead")}
      >
        <ServiceInvestmentRegister rows={rows} />
      </ModelSection>
      <ModelSection
        id="terms"
        index={4}
        ground="band"
        title={tm("sections.terms.title")}
        lead={tm("sections.terms.lead")}
      >
        <CommercialTerms
          locale={locale}
          schedule={paymentScheduleView(lc, pricing)}
          terms={termsView(lc, pricing)}
          warrantyDays={tokens.warrantyDays ?? ""}
        />
      </ModelSection>
      <div id="faq" className="scroll-mt-24">
        <FaqSection namespace="pricing.faq" titleClassName={SECTION_TITLE} />
      </div>
      <SectionEndCta
        title={tm("close.title")}
        body={tm("close.lead")}
        primary="projectRange"
        secondary="technicalCall"
        world="blue"
        size="display"
        titleClassName={`${SECTION_TITLE} max-w-[14ch]`}
      />
      </div>
    </>
  );
}
