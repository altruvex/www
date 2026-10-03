"use client";
import {
  LabHero,
  StackedRows,
} from "@/components/sections/interface-lab/interface-lab";
import { accentWorldClass, serviceWorld } from "@/lib/config/accent-world";
import { cn } from "@/lib/utils/utils";
import type { ReactNode } from "react";

export default function InterfaceDesignPage({ investment }: { investment: ReactNode }) {
  return (
    <div className={cn("relative min-h-screen w-full overflow-x-clip", accentWorldClass(serviceWorld("interface-design")))}>
      <LabHero />
      <StackedRows />
      {investment}
    </div>
  );
}
