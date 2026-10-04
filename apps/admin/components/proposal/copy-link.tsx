"use client";

import * as React from "react";
import { Check, Copy } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@repo/ui";

export function CopyLinkButton({
  url,
  label = "Copy link",
  size,
}: {
  url: string;
  label?: string;
  size?: "sm";
}) {
  const [copied, setCopied] = React.useState(false);

  React.useEffect(() => {
    if (!copied) return;
    const timer = window.setTimeout(() => setCopied(false), 2000);
    return () => window.clearTimeout(timer);
  }, [copied]);

  async function copy() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      toast.success("Link copied");
    } catch {
      toast.error("The browser refused the clipboard. Select the link and copy it by hand.", {
        description: url,
      });
    }
  }

  return (
    <Button type="button" variant="outline" size={size} onClick={copy}>
      {copied ? (
        <Check className="size-3.5 text-success" aria-hidden />
      ) : (
        <Copy className="size-3.5 text-subtle-foreground" aria-hidden />
      )}
      {copied ? "Copied" : label}
    </Button>
  );
}
