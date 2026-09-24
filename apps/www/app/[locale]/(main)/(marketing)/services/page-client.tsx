"use client";

import { SectionEndCta } from "@/components/sections/section-end-cta";
import { ServicesHeroIndex } from "@/components/sections/services-index/services-hero-index";
import { ServicesStage } from "@/components/sections/services-index/services-stage";
import { ErrorBoundary } from "@/components/shared/error-boundary";
import { useTranslations } from "next-intl";
import { memo } from "react";

export default memo(function ServicesPage() {
  const t = useTranslations("servicesPage.loop.close");
  return (
    <main className="relative min-h-screen w-full overflow-x-clip bg-background text-foreground">
      <ServicesHeroIndex />
      <ErrorBoundary>
        <ServicesStage />
      </ErrorBoundary>
      <SectionEndCta
        title={t("title")}
        titleAccent={t("titleAccent")}
        body={t("body")}
        primary="describeTheBuild"
        secondary="realBuild"
      />
    </main>
  );
});
