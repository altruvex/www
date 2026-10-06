"use client";
import { DevStudio } from "@/components/sections/dev-studio/dev-studio";
import { SectionEndCta } from "@/components/sections/section-end-cta";
import { ServiceFaqSection } from "@/components/sections/technical-section";
import { accentWorldClass, serviceWorld } from "@/lib/config/accent-world";
import { cn } from "@/lib/utils/utils";
import { useTranslations } from "next-intl";
import type { ReactNode } from "react";

export default function DevelopmentPage({ investment }: { investment: ReactNode }) {
  const t = useTranslations("serviceDetails.development.close");
  const world = serviceWorld("development");

  return (
    <div className={cn("relative min-h-screen w-full overflow-x-clip", accentWorldClass(world))}>
      <DevStudio investment={investment} />
      <ServiceFaqSection namespace="serviceDetails.development.faq" world={world} />
      <SectionEndCta
        world={world}
        title={t("title")}
        titleAccent={t("titleAccent")}
        body={t("body")}
        primary="describeTheBuild"
        secondary="architecture"
      />
    </div>
  );
}
