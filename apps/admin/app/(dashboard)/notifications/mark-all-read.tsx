"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { CheckCheck } from "lucide-react";
import { Button } from "@repo/ui";
import { markNotificationsRead } from "@/app/(dashboard)/_actions/records";

export function MarkAllRead() {
  const router = useRouter();
  const [busy, startTransition] = React.useTransition();

  return (
    <Button
      variant="outline"
      disabled={busy}
      onClick={() =>
        startTransition(async () => {
          try {
            await markNotificationsRead();
            toast.success("All notifications marked read");
            router.refresh();
          } catch (error) {
            toast.error("Could not update", {
              description: error instanceof Error ? error.message : "Unknown error",
            });
          }
        })
      }
    >
      <CheckCheck className="size-3.5" />
      Mark all read
    </Button>
  );
}
