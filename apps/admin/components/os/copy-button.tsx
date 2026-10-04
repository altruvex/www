"use client";

import * as React from "react";
import { Check, Copy } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export function CopyValueButton({
  value,
  label,
  className,
}: {
  value: string;
  label: string;
  className?: string;
}) {
  const [copied, setCopied] = React.useState(false);

  React.useEffect(() => {
    if (!copied) return;
    const timer = window.setTimeout(() => setCopied(false), 1600);
    return () => window.clearTimeout(timer);
  }, [copied]);

  async function copy(event: React.MouseEvent) {
    event.preventDefault();
    event.stopPropagation();
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      toast.success(`${label} copied`, { description: value });
    } catch {
      toast.error("The browser refused the clipboard. Select the text and copy it by hand.", {
        description: value,
      });
    }
  }

  return (
    <button
      type="button"
      onClick={copy}
      title={`Copy ${label.toLowerCase()}`}
      aria-label={`Copy ${label.toLowerCase()}`}
      className={cn(
        "inline-flex size-5 shrink-0 items-center justify-center rounded-xs text-subtle-foreground hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-1",
        className,
      )}
    >
      {copied ? (
        <Check className="size-3 text-success" aria-hidden />
      ) : (
        <Copy className="size-3" aria-hidden />
      )}
    </button>
  );
}
