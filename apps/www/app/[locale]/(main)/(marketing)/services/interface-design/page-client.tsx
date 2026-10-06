"use client";
import {
  LabHero,
  StackedRows,
} from "@/components/sections/interface-lab/interface-lab";
import { SectionEndCta } from "@/components/sections/section-end-cta";
import {
  ServiceFit,
  ServiceSteps,
  ServiceTerms,
} from "@/components/sections/services-index/service-brief";
import { ServiceFaqSection } from "@/components/sections/technical-section";
import { accentWorldClass, serviceWorld } from "@/lib/config/accent-world";
import { cn } from "@/lib/utils/utils";
import { useTranslations } from "next-intl";
import type { ReactNode } from "react";

const BRIEF = "serviceDetails.webDesign.brief";

export default function InterfaceDesignPage({ investment }: { investment: ReactNode }) {
  const t = useTranslations("serviceDetails.webDesign.close");
  const world = serviceWorld("interface-design");

  return (
    <div className={cn("relative min-h-screen w-full overflow-x-clip", accentWorldClass(world))}>
      <LabHero />
      <ServiceFit namespace={BRIEF} id="fit" italicWorld={false} />
      <ServiceTerms namespace={BRIEF} id="what-you-receive" />
      {investment}
      <ServiceSteps namespace={BRIEF} id="how-it-runs" />
      <StackedRows />
      <ServiceFaqSection namespace="serviceDetails.webDesign.faq" world={world} />
      <SectionEndCta
        world={world}
        title={t("title")}
        titleAccent={t("titleAccent")}
        body={t("body")}
        primary="describeTheBuild"
        secondary="technicalCall"
      />
    </div>
  );
}
