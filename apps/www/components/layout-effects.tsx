"use client";

import { CommandPaletteHost } from "@/components/interactive/command-palette-host";
import { ThemeProvider } from "@/components/providers/theme-provider";
import { useFirstInteraction } from "@/hooks/use-first-interaction";
import { useIdleMount } from "@/hooks/use-idle-mount";
import dynamic from "next/dynamic";
import { Suspense, type ReactNode } from "react";

const CustomCursorLazy = dynamic(() => import("@/components/interactive/custom-cursor"), {
  ssr: false,
});

const ExitIntentLazy = dynamic(
  () =>
    import("@/components/interactive/exit-intent-modal").then((m) => ({
      default: m.ExitIntentModal,
    })),
  { ssr: false },
);

const InitialLoaderLazy = dynamic(
  () =>
    import("@/components/shared/initial-loader").then((m) => ({
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
        <CommandPaletteHost />
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
