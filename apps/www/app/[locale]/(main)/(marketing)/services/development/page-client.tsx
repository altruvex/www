"use client";
import { DevStudio } from "@/components/sections/dev-studio/dev-studio";
import { accentWorldClass, serviceWorld } from "@/lib/config/accent-world";
import { cn } from "@/lib/utils/utils";
import type { ReactNode } from "react";

export default function DevelopmentPage({ investment }: { investment: ReactNode }) {
  return (
    <div className={cn("relative min-h-screen w-full overflow-x-clip", accentWorldClass(serviceWorld("development")))}>
      <DevStudio investment={investment} />
    </div>
  );
}
