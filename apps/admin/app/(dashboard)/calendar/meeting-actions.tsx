"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Check, X } from "lucide-react";
import { Button, LoadingIcon } from "@repo/ui";
import { ConfirmDialog } from "@/components/os/confirm-dialog";
import { RowActions, useRecordDelete } from "@/components/os/delete-record";
import { RecordCallSheet } from "@/components/os/record-call-sheet";
import { setMeetingStatus } from "@/app/(dashboard)/_actions/records";

async function moveMeeting(
  meetingId: string,
  next: string,
  success: string,
): Promise<{ ok: boolean; message: string }> {
  try {
    await setMeetingStatus(meetingId, next);
    return { ok: true, message: success };
  } catch (error) {
    return {
      ok: false,
      message: `${error instanceof Error && error.message ? error.message : "The server refused the change."} Nothing was changed.`,
    };
  }
}

type Pending = { next: "REJECTED" | "CANCELLED" } | null;

const CONFIRM: Record<
  NonNullable<Pending>["next"],
  {
    title: (t: string) => string;
    body: string;
    label: string;
    done: string;
    tone: "danger" | "default";
  }
> = {
  REJECTED: {
    title: (t) => `Decline “${t}”?`,
    body: "The request stays on the record as declined. Nothing is sent to the guest — tell them yourself if they should know.",
    label: "Decline request",
    done: "Request declined.",
    tone: "danger",
  },
  CANCELLED: {
    title: (t) => `Cancel “${t}”?`,
    body: "The meeting leaves the calendar but stays on the record as cancelled. Nothing is sent to the guest — tell them yourself.",
    label: "Cancel meeting",
    done: "Meeting cancelled.",
    tone: "danger",
  },
};

export function MeetingActions({
  meetingId,
  title,
  status = "PENDING",
  afterDeleteHref,
  canApprove = true,
  canDelete = true,
  client = null,
  closedReason = null,
}: {
  meetingId: string;
  title: string;
  status?: string;
  afterDeleteHref?: string;
  canApprove?: boolean;
  canDelete?: boolean;
  /** The linked client, for "Record the call"; null when there is none. */
  client?: { label: string } | null;
  /** Why the client takes no sales moves (signed, spam), or null. */
  closedReason?: string | null;
}) {
  const router = useRouter();
  const [busy, startTransition] = React.useTransition();
  const [pending, setPending] = React.useState<Pending>(null);
  const del = useRecordDelete({
    entity: "meeting",
    onDeleted: () => {
      if (afterDeleteHref) router.replace(afterDeleteHref);
    },
  });

  function approve() {
    startTransition(async () => {
      const result = await moveMeeting(
        meetingId,
        "APPROVED",
        "Meeting approved. It is on the calendar.",
      );
      toast[result.ok ? "success" : "error"](result.message);
      if (result.ok) router.refresh();
    });
  }

  const agreed = status === "APPROVED" || status === "RESCHEDULED";
  const confirm = pending ? CONFIRM[pending.next] : null;
  if (!canApprove && !canDelete) return null;

  return (
    <div className="flex shrink-0 flex-wrap items-center gap-1.5">
      {canApprove && status === "PENDING" && (
        <>
          <Button
            size="sm"
            variant="outline"
            className="pointer-coarse:h-11"
            disabled={busy}
            onClick={approve}
          >
            {busy ? <LoadingIcon size="sm" /> : <Check className="size-3.5" />}
            Approve
          </Button>
          <Button
            size="sm"
            variant="ghost"
            className="pointer-coarse:h-11"
            disabled={busy}
            onClick={() => setPending({ next: "REJECTED" })}
          >
            <X className="size-3.5" />
            Decline
          </Button>
        </>
      )}
      {canApprove && agreed && (
        <>
          {/* Completing a call means recording what it decided (docs/sales-os.md R7). */}
          <RecordCallSheet
            meetingId={meetingId}
            meetingTitle={title}
            client={client}
            closedReason={closedReason}
            triggerLabel="Mark completed"
          />
          <Button
            size="sm"
            variant="ghost"
            className="pointer-coarse:h-11"
            disabled={busy}
            onClick={() => setPending({ next: "CANCELLED" })}
          >
            <X className="size-3.5" />
            Cancel meeting
          </Button>
        </>
      )}
      {canDelete && (
        <RowActions
          onDelete={() => del.request({ id: meetingId, label: title })}
          deleteLabel="Delete meeting"
        />
      )}
      {del.dialog}

      {confirm && pending && (
        <ConfirmDialog
          open
          onOpenChange={(open) => {
            if (!open) setPending(null);
          }}
          tone={confirm.tone}
          title={confirm.title(title)}
          body={confirm.body}
          confirmLabel={confirm.label}
          cancelLabel="Keep it"
          onConfirm={async () => {
            const result = await moveMeeting(
              meetingId,
              pending.next,
              confirm.done,
            );
            if (result.ok) router.refresh();
            return result;
          }}
        />
      )}
    </div>
  );
}
