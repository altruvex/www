"use client";

import {
  AuditHero,
  AuditOffer,
  CostCurve,
  ScanChannels,
} from "@/components/sections/consulting-audit";
import { SectionEndCta } from "@/components/sections/section-end-cta";
import {
  ServiceFit,
  ServiceSteps,
  ServiceTerms,
} from "@/components/sections/services-index/service-brief";
import { ServiceFaqSection } from "@/components/sections/technical-section";
import { accentWorldClass, serviceWorld } from "@/lib/config/accent-world";
import { cn } from "@/lib/utils/utils";
import type { ConsultingView } from "@repo/pricing-schema";
import { useTranslations } from "next-intl";

const BRIEF = "serviceDetails.consulting.brief";

export default function ConsultingPage({
  audit,
  buildRange,
}: {
  audit: ConsultingView;
  buildRange: string;
}) {
  const t = useTranslations("serviceDetails.consulting.close");
  const world = serviceWorld("consulting");

  return (
    <div
      className={cn(
        "relative min-h-screen w-full overflow-x-clip",
        accentWorldClass(world),
      )}
    >
      <AuditHero />
      <AuditOffer audit={audit} />
      <CostCurve audit={audit} buildRange={buildRange} />
      <ScanChannels />
      <ServiceFit namespace={BRIEF} id="fit" italicWorld={false} />
      <ServiceSteps namespace={BRIEF} id="how-it-runs" />
      <ServiceTerms namespace={BRIEF} id="terms" />
      <ServiceFaqSection namespace="serviceDetails.consulting.seo.faq" world={world} />
      <SectionEndCta
        world={world}
        title={t("title")}
        titleAccent={t("titleAccent")}
        body={t("body")}
        primary="technicalAudit"
        secondary="technicalCall"
      />
    </div>
  );
}
