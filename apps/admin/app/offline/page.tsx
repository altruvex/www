"use client";

import { RefreshCw, WifiOff } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { Button } from "@repo/ui";

import { AuthShell } from "@/app/login/auth-shell";
import { cn } from "@/lib/utils";

export default function OfflinePage() {
  const router = useRouter();
  const [status, setStatus] = useState<"idle" | "checking" | "offline">("idle");

  function retry() {
    setStatus("checking");
    if (typeof navigator !== "undefined" && navigator.onLine) {
      router.refresh();
      return;
    }
    setStatus("offline");
  }

  return (
    <AuthShell
      label="Operating system"
      icon={<WifiOff />}
      title="You are offline"
      lead="This page could not be loaded because the connection dropped. Nothing you had already saved is affected."
    >
      <div className="flex flex-wrap gap-2">
        <Button variant="brand" size="lg" onClick={retry} disabled={status === "checking"}>
          <RefreshCw aria-hidden />
          Try again
        </Button>
        <Button variant="outline" size="lg" onClick={() => window.history.back()}>
          Go back
        </Button>
      </div>
      <p className="telemetry mt-3 flex items-center gap-2 text-subtle-foreground" role="status">
        <span
          className={cn(
            "size-1.5 rounded-full",
            status === "offline" ? "bg-danger" : "bg-border-strong",
          )}
          aria-hidden
        />
        {status === "offline"
          ? "Still offline. Check the connection and try again."
          : status === "checking"
            ? "Checking the connection…"
            : "Waiting for the connection to return."}
      </p>
    </AuthShell>
  );
}
