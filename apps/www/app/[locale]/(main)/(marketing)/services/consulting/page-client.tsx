"use client";

import {
  AuditHero,
  AuditOffer,
  CostCurve,
  FindingsRegister,
  ScanChannels,
} from "@/components/sections/consulting-audit";
import { DisplayClose } from "@/components/sections/display-close";
import { bodyMarks } from "@/components/ui/rich-text";
import { accentWorldClass, serviceWorld } from "@/lib/config/accent-world";
import { cn } from "@/lib/utils/utils";
import type { ConsultingView } from "@repo/pricing-schema";
import { useTranslations } from "next-intl";
import type { ReactNode } from "react";

export default function ConsultingPage({
  audit,
  buildRange,
  faq,
}: {
  audit: ConsultingView;
  buildRange: string;
  faq: ReactNode;
}) {
  return (
    <div
      className={cn(
        "relative min-h-screen w-full overflow-x-clip",
        accentWorldClass(serviceWorld("consulting")),
      )}
    >
      <AuditHero audit={audit} />
      <FindingsRegister />
      <CostCurve audit={audit} buildRange={buildRange} />
      <ScanChannels />
      <AuditOffer audit={audit} />
      {faq}
      <ConsultingClose />
    </div>
  );
}

function ConsultingClose() {
  const t = useTranslations("serviceDetails.consulting.cta");

  return (
    <DisplayClose
      id="consulting-close-heading"
      eyebrow={t("eyebrow")}
      title={t("title")}
      titleAccent={t("titleAccent")}
      description={t.rich("description", bodyMarks)}
      primary="technicalCall"
      secondary="technicalAudit"
    />
  );
}
