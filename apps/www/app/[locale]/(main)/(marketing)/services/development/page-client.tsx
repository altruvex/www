"use client";
import { DevStudio } from "@/components/sections/dev-studio/dev-studio";
import { accentWorldClass, serviceWorld } from "@/lib/config/accent-world";
import { cn } from "@/lib/utils/utils";

/*
 * /services/development — the dark studio (2026-09-19). Every section lives in
 * components/sections/dev-studio; the page only sets the discipline's world.
 * Chosen from docs/prototypes/2026-09-services-development (c.html); the
 * pipeline, tech-DNA and terminal-CTA sections it replaced are no longer used.
 */
export default function DevelopmentPage() {
  return (
    <div className={cn("relative min-h-screen w-full overflow-x-clip", accentWorldClass(serviceWorld("development")))}>
      <DevStudio />
    </div>
  );
}
