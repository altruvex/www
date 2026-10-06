"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Pencil } from "lucide-react";
import { toast } from "sonner";

import { Button, Input } from "@repo/ui";

import { updateIncidentText } from "@/app/(dashboard)/_actions/engineering";

export function IncidentText({
  id,
  title,
  detail,
  canEdit,
}: {
  id: string;
  title: string;
  detail: string | null;
  canEdit: boolean;
}) {
  const router = useRouter();
  const [editing, setEditing] = React.useState(false);
  const [draftTitle, setDraftTitle] = React.useState(title);
  const [draftDetail, setDraftDetail] = React.useState(detail ?? "");
  const [pending, startTransition] = React.useTransition();
  const titleId = React.useId();
  const detailId = React.useId();

  if (!editing) {
    return (
      <div className="space-y-2">
        {detail ? (
          <p className="whitespace-pre-wrap text-base">{detail}</p>
        ) : (
          <p className="text-base text-muted-foreground">
            No detail was written when it was opened. Add what is known, or post
            an update.
          </p>
        )}
        {canEdit && (
          <Button
            variant="ghost"
            size="sm"
            className="pointer-coarse:min-h-11"
            onClick={() => {
              setDraftTitle(title);
              setDraftDetail(detail ?? "");
              setEditing(true);
            }}
          >
            <Pencil className="size-3.5" />
            Edit title and detail
          </Button>
        )}
      </div>
    );
  }

  return (
    <form
      className="space-y-3"
      onSubmit={(event) => {
        event.preventDefault();
        startTransition(async () => {
          const result = await updateIncidentText({
            id,
            title: draftTitle,
            detail: draftDetail.trim() ? draftDetail : null,
          });
          if (result.ok) {
            const unchanged =
              draftTitle.trim() === title &&
              (draftDetail.trim() || null) === (detail ?? null);
            if (unchanged) toast.info(result.message);
            else toast.success(result.message);
            setEditing(false);
            router.refresh();
          } else {
            toast.error(result.message);
          }
        });
      }}
    >
      <div className="space-y-1">
        <label
          htmlFor={titleId}
          className="telemetry block text-subtle-foreground"
        >
          Title
        </label>
        <Input
          id={titleId}
          value={draftTitle}
          onChange={(event) => setDraftTitle(event.target.value)}
          required
          maxLength={300}
          autoFocus
        />
      </div>
      <div className="space-y-1">
        <label
          htmlFor={detailId}
          className="telemetry block text-subtle-foreground"
        >
          Detail
        </label>
        <textarea
          id={detailId}
          value={draftDetail}
          onChange={(event) => setDraftDetail(event.target.value)}
          rows={5}
          maxLength={5000}
          className="w-full rounded-ctl-xl border border-border-subtle bg-background px-2 py-1.5 text-base outline-none focus-visible:border-brand"
        />
        <p className="text-meta text-subtle-foreground">
          The change is recorded in the incident&apos;s history with the old
          wording.
        </p>
      </div>
      <div className="flex justify-end gap-2">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="pointer-coarse:min-h-11"
          disabled={pending}
          onClick={() => setEditing(false)}
        >
          Cancel
        </Button>
        <Button
          type="submit"
          variant="outline"
          size="sm"
          className="pointer-coarse:min-h-11"
          disabled={pending || !draftTitle.trim()}
        >
          {pending ? "Saving…" : "Save"}
        </Button>
      </div>
    </form>
  );
}
