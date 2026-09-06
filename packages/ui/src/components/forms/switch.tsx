"use client";

import * as SwitchPrimitive from "@radix-ui/react-switch";
import { cn } from "../../lib/utils";

export function Switch({ className, ...props }: React.ComponentProps<typeof SwitchPrimitive.Root>) {
  return (
    <SwitchPrimitive.Root
      className={cn(
        "peer inline-flex h-4 w-7 shrink-0 items-center rounded-full border border-transparent",
        "bg-border-mid transition-colors duration-[var(--dur-state)]",
        "data-[state=checked]:bg-brand",
        "disabled:cursor-not-allowed disabled:opacity-40",
        className,
      )}
      {...props}
    >
      <SwitchPrimitive.Thumb
        className={cn(
          "pointer-events-none block size-3 rounded-full bg-card shadow-[var(--elev-1)]",
          "transition-transform duration-[var(--dur-state)]",
          "translate-x-0.5 data-[state=checked]:translate-x-3.5",
        )}
      />
    </SwitchPrimitive.Root>
  );
}
