"use client";

import { SectionEndCta } from "@/components/sections/section-end-cta";
import { MaintenanceHero } from "@/components/sections/service-maintenance/maintenance-hero";
import { MaintenancePlans } from "@/components/sections/service-maintenance/maintenance-plans";
import { ErrorBoundary } from "@/components/shared/error-boundary";
import { serviceWorld } from "@/lib/config/accent-world";
import type { MaintenanceView } from "@repo/pricing-schema";
import { useTranslations } from "next-intl";


export default function MaintenancePage({
  plans,
}: {
  plans: readonly MaintenanceView[];
}) {
  const t = useTranslations("common.endCta.pages.maintenance");

  return (
    <main className="relative min-h-screen w-full overflow-x-clip">
      <MaintenanceHero plans={plans} />
      <ErrorBoundary>
        <MaintenancePlans plans={plans} />
      </ErrorBoundary>
      <SectionEndCta
        world={serviceWorld("maintenance")}
        title={t("title")}
        titleAccent={t("titleAccent")}
        body={t("body")}
        primary="maintenanceEnquiry"
        secondary="maintenancePlans"
      />
    </main>
  );
}
