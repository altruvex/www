"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { setMeetingStatus } from "@/app/(dashboard)/_actions/records";

export function MeetingActions({ meetingId }: { meetingId: string }) {
  const router = useRouter();
  const [busy, startTransition] = React.useTransition();

  function act(status: string, label: string) {
    startTransition(async () => {
      try {
        await setMeetingStatus(meetingId, status);
        toast.success(label);
        router.refresh();
      } catch (error) {
        toast.error("Could not update the meeting", {
          description: error instanceof Error ? error.message : "Unknown error",
        });
      }
    });
  }

  return (
    <div className="flex shrink-0 items-center gap-1.5">
      <Button size="sm" variant="outline" disabled={busy} onClick={() => act("APPROVED", "Meeting approved")}>
        <Check className="size-3.5" />
        Approve
      </Button>
      <Button size="sm" variant="ghost" disabled={busy} onClick={() => act("REJECTED", "Meeting declined")}>
        <X className="size-3.5" />
        Decline
      </Button>
    </div>
  );
}
