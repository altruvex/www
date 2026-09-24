"use client";
import {
  LabClose,
  LabHero,
  StackedRows,
} from "@/components/sections/interface-lab/interface-lab";
import { accentWorldClass, serviceWorld } from "@/lib/config/accent-world";
import { cn } from "@/lib/utils/utils";

export default function InterfaceDesignPage() {
  return (
    <div className={cn("relative min-h-screen w-full overflow-x-clip", accentWorldClass(serviceWorld("interface-design")))}>
      <LabHero />
      <StackedRows />
      <LabClose />
    </div>
  );
}
