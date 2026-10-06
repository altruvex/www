import * as React from "react";
import { Button, Hint } from "@repo/ui";
import { cn } from "@/lib/utils";

function SoonMark({ className }: { className?: string }) {
  return (
    <span
      aria-hidden
      className={cn(
        "telemetry inline-flex h-4 shrink-0 items-center rounded-xs border border-border-subtle bg-surface px-1 leading-none text-subtle-foreground",
        className,
      )}
    >
      Soon
    </span>
  );
}

export function Soon({ reason, className }: { reason: string; className?: string }) {
  return (
    <Hint label={reason}>
      <span
        tabIndex={0}
        role="img"
        aria-label={`Not available yet: ${reason}`}
        className="inline-flex rounded-xs outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
      >
        <SoonMark className={className} />
      </span>
    </Hint>
  );
}

export function SoonButton({
  children,
  reason,
  icon,
  variant = "outline",
  size = "sm",
  className,
}: {
  children: React.ReactNode;
  reason: string;
  icon?: React.ReactNode;
  variant?: "outline" | "ghost" | "secondary";
  size?: "sm" | "default";
  className?: string;
}) {
  return (
    <Hint label={reason}>
      <span
        tabIndex={0}
        role="button"
        aria-disabled="true"
        className="inline-flex cursor-not-allowed rounded-full outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
      >
        <Button
          type="button"
          variant={variant}
          size={size}
          disabled
          tabIndex={-1}
          aria-hidden
          className={className}
        >
          {icon}
          {children}
          <SoonMark />
        </Button>
        <span className="sr-only">
          {typeof children === "string" ? `${children}, ` : ""}not available yet: {reason}
        </span>
      </span>
    </Hint>
  );
}
