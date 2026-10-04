"use client";

import { Check, Copy } from "lucide-react";
import { useEffect, useState } from "react";

import { Button } from "@repo/ui";

export function CopyLinkButton() {
  const [state, setState] = useState<"idle" | "copied" | "failed">("idle");

  useEffect(() => {
    if (state === "idle") return;
    const timer = window.setTimeout(() => setState("idle"), 2500);
    return () => window.clearTimeout(timer);
  }, [state]);

  async function copy() {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setState("copied");
    } catch {
      setState("failed");
    }
  }

  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      onClick={copy}
      aria-live="polite"
      className={state === "copied" ? "border-success/40 text-success" : undefined}
    >
      {state === "copied" ? <Check aria-hidden /> : <Copy aria-hidden />}
      {state === "copied" ? "Link copied" : state === "failed" ? "Copy from the address bar" : "Copy link"}
    </Button>
  );
}
