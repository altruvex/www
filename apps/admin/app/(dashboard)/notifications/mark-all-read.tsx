"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { CheckCheck } from "lucide-react";
import { Button } from "@repo/ui";
import { markNotificationsRead } from "@/app/(dashboard)/_actions/records";

export function MarkAllRead({ unread }: { unread: number }) {
  const router = useRouter();
  const [busy, startTransition] = React.useTransition();

  return (
    <Button
      variant="outline"
      disabled={busy}
      onClick={() =>
        startTransition(async () => {
          try {
            const result = await markNotificationsRead();
            if (!result.ok) {
              toast.error("Could not mark them read", { description: result.message });
              return;
            }
            if (result.changed) toast.success(result.message);
            else toast.info(result.message);
            router.refresh();
          } catch (error) {
            toast.error("Could not mark them read", {
              description: error instanceof Error && error.message ? error.message : "The server refused the change.",
            });
          }
        })
      }
    >
      <CheckCheck className="size-3.5" aria-hidden />
      {busy ? "Marking…" : `Mark ${unread} read`}
    </Button>
  );
}
