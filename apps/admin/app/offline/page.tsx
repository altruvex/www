"use client";

import { useState } from "react";
import { RefreshCw, WifiOff } from "lucide-react";
import { useRouter } from "next/navigation";

import { Button } from "@repo/ui";

/**
 * Served by the service worker when the network is gone. The same plane the
 * sign-in and security screens use; the status line replaces the browser
 * alert the previous version threw up.
 */
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
    <main className="flex min-h-dvh items-center justify-center px-4 py-10">
      <div className="w-full max-w-95">
        <div className="mb-5 flex items-center gap-2">
          <span className="grid size-6 shrink-0 place-items-center rounded-md bg-foreground font-sans text-meta font-semibold text-background">
            A
          </span>
          <span className="font-sans text-md font-semibold tracking-tight">Altruvex</span>
          <span className="telemetry ms-auto text-subtle-foreground">Operating system</span>
        </div>
        <div className="plane p-5">
          <div className="flex items-center gap-2">
            <WifiOff className="size-4 text-muted-foreground" />
            <h1 className="text-lg font-semibold">You are offline</h1>
          </div>
          <p className="mt-1 text-base text-muted-foreground">
            This page could not be loaded because the connection dropped. Nothing you had already
            saved is affected.
          </p>
          <div className="mt-5 flex flex-wrap gap-2">
            <Button variant="brand" className="h-9" onClick={retry} disabled={status === "checking"}>
              <RefreshCw className="size-3.5" />
              Try again
            </Button>
            <Button variant="outline" className="h-9" onClick={() => window.history.back()}>
              Go back
            </Button>
          </div>
          <p className="mt-3 flex items-center gap-2 font-mono text-micro text-subtle-foreground" role="status">
            <span
              className={status === "offline" ? "size-1.5 rounded-full bg-danger" : "size-1.5 rounded-full bg-border-strong"}
              aria-hidden
            />
            {status === "offline"
              ? "Still offline. Check the connection and try again."
              : status === "checking"
                ? "Checking the connection…"
                : "Waiting for the connection to return."}
          </p>
        </div>
      </div>
    </main>
  );
}
