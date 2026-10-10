"use client";

import { Nav } from "@/components/layout/nav";
import { useLoading } from "@/components/providers/loading-provider";
import { usePathname } from "@/i18n/navigation";
import { cn } from "@/lib/utils/utils";
import { layoutChildren } from "@/types";
import { useEffect } from "react";
import { Footer } from "./footer";
import {
  MOBILE_CONTACT_BAR_SPACE,
  MobileContactBar,
  showsMobileContactBar,
} from "./mobile-contact-bar";

function AnimationController() {
  const { isInitialLoadComplete } = useLoading();

  useEffect(() => {
    if (!isInitialLoadComplete) return;
    document.documentElement.setAttribute("data-initial-load", "complete");
    let cancelled = false;

    const raf = requestAnimationFrame(async () => {
      const { ScrollTrigger } = await import("@/lib/utils/gsap");

      if (!cancelled) {
        setTimeout(() => {
          ScrollTrigger.refresh(true);
        }, 100);
      }
    });

    return () => {
      cancelled = true;
      cancelAnimationFrame(raf);
    };
  }, [isInitialLoadComplete]);

  return null;
}

export function MainLayoutContent({ children }: layoutChildren) {
  const hasContactBar = showsMobileContactBar(usePathname());
  return (
    <main
      id="main-content"
      tabIndex={-1}
      className="relative min-h-screen w-full bg-background outline-none"
    >
      <AnimationController />
      <Nav />
      <div
        className={cn(
          "relative z-10 rounded-b-panel-lg bg-background",
          hasContactBar && MOBILE_CONTACT_BAR_SPACE,
        )}
      >
        {children}
      </div>
      <Footer />
      <MobileContactBar />
    </main>
  );
}
