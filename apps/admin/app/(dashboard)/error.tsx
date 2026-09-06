"use client";

import { useEffect } from "react";
import Link from "next/link";
import { ErrorState } from "@/components/os/error-state";
import { Button } from "@/components/ui/button";

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Admin OS route error:", error);
  }, [error]);

  return (
    <div className="mx-auto max-w-2xl py-8">
      <ErrorState
        what="This page could not be loaded"
        impact="Nothing was changed. The records behind this screen are untouched — this is a read failure, not a write one."
        onRetry={reset}
        detail={error.digest ? `${error.message}\ndigest: ${error.digest}` : error.message}
        recovery={
          <>
            <Button asChild variant="outline">
              <Link href="/">
                Back to the dashboard
              </Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/health">
                Check system health
              </Link>
            </Button>
          </>
        }
      />
    </div>
  );
}
