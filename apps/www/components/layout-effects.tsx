"use client";

import { useFirstInteraction } from "@/hooks/use-first-interaction";
import { useIdleMount } from "@/hooks/use-idle-mount";
import { ThemeProvider } from "@/components/providers/theme-provider";
import { ThemeScript } from "@/components/theme-script";
import dynamic from "next/dynamic";
import { Suspense, type ReactNode } from "react";

const CustomCursorLazy = dynamic(() => import("@/components/custom-cursor"), {
  ssr: false,
});

const ExitIntentLazy = dynamic(
  () =>
    import("@/components/exit-intent-modal").then((m) => ({
      default: m.ExitIntentModal,
    })),
  { ssr: false },
);

const InitialLoaderLazy = dynamic(
  () =>
    import("@/components/initial-loader").then((m) => ({
      default: m.InitialLoader,
    })),
  { ssr: false },
);

const SmoothScrollLazy = dynamic(
  () =>
    import("@/components/providers/smooth-scroll-provider").then((m) => ({
      default: m.SmoothScrollProvider,
    })),
  { ssr: false },
);

export function LayoutEffects({ children }: { children: ReactNode }) {
  const idleMounted = useIdleMount({ timeout: 1200 });
  const hasInteracted = useFirstInteraction();
  const shouldMountNonCritical = idleMounted || hasInteracted;
  const content = (
    <>
      {shouldMountNonCritical ? <InitialLoaderLazy /> : null}
      <ThemeScript />
      <ThemeProvider
        attribute="class"
        defaultTheme="system"
        enableSystem
        disableTransitionOnChange
      >
        <Suspense fallback={null}>
          {shouldMountNonCritical ? <CustomCursorLazy /> : null}
        </Suspense>
        {children}
        {shouldMountNonCritical ? <ExitIntentLazy /> : null}
      </ThemeProvider>
    </>
  );

  return shouldMountNonCritical ? (
    <SmoothScrollLazy>{content}</SmoothScrollLazy>
  ) : (
    content
  );
}
