"use client";

import { SectionEndCta } from "@/components/sections/section-end-cta";
import { MaintenanceHero } from "@/components/sections/service-maintenance/maintenance-hero";
import { MaintenancePlans } from "@/components/sections/service-maintenance/maintenance-plans";
import {
  ServiceFit,
  ServiceSteps,
} from "@/components/sections/services-index/service-brief";
import { ServiceFaqSection } from "@/components/sections/technical-section";
import { ErrorBoundary } from "@/components/shared/error-boundary";
import { accentWorldClass, serviceWorld } from "@/lib/config/accent-world";
import type { MaintenanceView } from "@repo/pricing-schema";
import { useTranslations } from "next-intl";

const BRIEF = "serviceDetails.maintenance.brief";

export default function MaintenancePage({
  plans,
}: {
  plans: readonly MaintenanceView[];
}) {
  const t = useTranslations("common.endCta.pages.maintenance");
  const world = serviceWorld("maintenance");

  return (
    <div className="relative min-h-screen w-full overflow-x-clip">
      <MaintenanceHero plans={plans} />
      <ErrorBoundary>
        <MaintenancePlans plans={plans} />
      </ErrorBoundary>
      <div className={accentWorldClass(world)}>
        <ServiceFit namespace={BRIEF} id="fit" />
        <ServiceSteps namespace={BRIEF} id="how-it-starts" />
        <ServiceFaqSection namespace="serviceDetails.maintenance.faq" />
      </div>
      <SectionEndCta
        world={world}
        title={t("title")}
        titleAccent={t("titleAccent")}
        body={t("body")}
        primary="maintenanceEnquiry"
        secondary="technicalCall"
      />
    </div>
  );
}
