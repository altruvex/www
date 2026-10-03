"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Check, X } from "lucide-react";
import { Button } from "@repo/ui";
import { RowActions, useRecordDelete } from "@/components/os/delete-record";
import { setMeetingStatus } from "@/app/(dashboard)/_actions/records";

/**
 * The status moves an operator can make from here. A request (PENDING) is
 * approved or declined; a meeting that has been agreed is marked done or
 * cancelled. Finished meetings (completed / cancelled / rejected) offer none.
 */
export function MeetingActions({
  meetingId,
  title,
  status = "PENDING",
  afterDeleteHref,
}: {
  meetingId: string;
  title: string;
  status?: string;
  /** Where to go once the meeting is deleted — the open sheet would otherwise point at nothing. */
  afterDeleteHref?: string;
}) {
  const router = useRouter();
  const [busy, startTransition] = React.useTransition();
  const del = useRecordDelete({
    entity: "meeting",
    onDeleted: () => {
      if (afterDeleteHref) router.replace(afterDeleteHref);
    },
  });

  function act(next: string, label: string) {
    startTransition(async () => {
      try {
        await setMeetingStatus(meetingId, next);
        toast.success(label);
        router.refresh();
      } catch (error) {
        toast.error("Could not update the meeting", {
          description: error instanceof Error ? error.message : "Unknown error",
        });
      }
    });
  }

  const agreed = status === "APPROVED" || status === "RESCHEDULED";

  return (
    <div className="flex shrink-0 flex-wrap items-center gap-1.5">
      {status === "PENDING" && (
        <>
          <Button size="sm" variant="outline" disabled={busy} onClick={() => act("APPROVED", "Meeting approved")}>
            <Check className="size-3.5" />
            Approve
          </Button>
          <Button size="sm" variant="ghost" disabled={busy} onClick={() => act("REJECTED", "Meeting declined")}>
            <X className="size-3.5" />
            Decline
          </Button>
        </>
      )}
      {agreed && (
        <>
          <Button size="sm" variant="outline" disabled={busy} onClick={() => act("COMPLETED", "Meeting marked completed")}>
            <Check className="size-3.5" />
            Mark completed
          </Button>
          <Button size="sm" variant="ghost" disabled={busy} onClick={() => act("CANCELLED", "Meeting cancelled")}>
            <X className="size-3.5" />
            Cancel meeting
          </Button>
        </>
      )}
      {/* Declining keeps the request on the record; deleting is for a booking
          that was never real — spam, or a duplicate of the one below it. */}
      <RowActions
        onDelete={() => del.request({ id: meetingId, label: title })}
        deleteLabel="Delete meeting"
      />
      {del.dialog}
    </div>
  );
}
