"use client";

import { CommandPaletteHost } from "@/components/interactive/command-palette-host";
import { useLoading } from "@/components/providers/loading-provider";
import { ThemeProvider } from "@/components/providers/theme-provider";
import { useFirstInteraction } from "@/hooks/use-first-interaction";
import { useIdleMount } from "@/hooks/use-idle-mount";
import dynamic from "next/dynamic";
import type { ReactNode } from "react";

const ExitIntentLazy = dynamic(
  () =>
    import("@/components/interactive/exit-intent-modal").then((m) => ({
      default: m.ExitIntentModal,
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
  const { isInitialLoadComplete } = useLoading();
  const shouldMountNonCritical =
    isInitialLoadComplete && (idleMounted || hasInteracted);

  return (
    <>
      {shouldMountNonCritical ? <SmoothScrollLazy /> : null}
      <ThemeProvider
        attribute="class"
        defaultTheme="system"
        enableSystem
      >
        <div vaul-drawer-wrapper="">
          {children}
          <CommandPaletteHost />
          {shouldMountNonCritical ? <ExitIntentLazy /> : null}
        </div>
      </ThemeProvider>
    </>
  );
}
