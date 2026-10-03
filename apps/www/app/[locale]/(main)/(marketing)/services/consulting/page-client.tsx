"use client";

import {
  AuditHero,
  AuditOffer,
  CostCurve,
  ScanChannels,
} from "@/components/sections/consulting-audit";
import { accentWorldClass, serviceWorld } from "@/lib/config/accent-world";
import { cn } from "@/lib/utils/utils";
import type { ConsultingView } from "@repo/pricing-schema";
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
      <CostCurve audit={audit} buildRange={buildRange} />
      <ScanChannels />
      <AuditOffer audit={audit} />
      {faq}
    </div>
  );
}
