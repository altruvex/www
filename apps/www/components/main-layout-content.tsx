"use client";

import { Nav } from "@/components/nav";
import { useLoading } from "@/components/providers/loading-provider";
import { layoutChildren } from "@/types";
import { useEffect } from "react";
import { Footer } from "./footer";
import { WhatsAppFab } from "./whatsapp-fab";

function AnimationController() {
  const { isInitialLoadComplete } = useLoading();

  useEffect(() => {
    if (!isInitialLoadComplete) return;
    document.documentElement.setAttribute("data-initial-load", "complete");
    let cancelled = false;

    const raf = requestAnimationFrame(async () => {
      const { ScrollTrigger } = await import("@/lib/gsap");

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
  return (
    <main
      id="main-content"
      tabIndex={-1}
      className="relative min-h-screen w-full bg-background outline-none"
    >
      <AnimationController />
      <Nav />
      <div className="relative z-10">
        {children}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 z-0"
          style={{
            background:
              "radial-gradient(ellipse 70% 40% at 50% -10%, var(--brand-soft), transparent)",
          }}
        />
      </div>
      <Footer />
      <WhatsAppFab />
    </main>
  );
}
