"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  Button,
  LoadingIcon,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Textarea,
} from "@repo/ui";
import { DateField } from "@/components/os/date-field";
import { updateLeadRecord } from "@/app/(dashboard)/_actions/lead-record";

const FIELD_LABEL = "block text-meta font-medium text-muted-foreground";
const NO_OWNER = "__none";

export interface LeadRecordInitial {
  ownerId: string | null;
  /** "YYYY-MM-DD" or "". */
  nextActionAt: string;
  nextActionNote: string;
}

/** Owner and next action for one client. Saving notifies a new owner. */
export function LeadRecordEditor({
  clientId,
  initial,
  admins,
}: {
  clientId: string;
  initial: LeadRecordInitial;
  admins: { id: string; label: string }[];
}) {
  const router = useRouter();
  const [ownerId, setOwnerId] = React.useState(initial.ownerId ?? NO_OWNER);
  const [day, setDay] = React.useState(initial.nextActionAt);
  const [note, setNote] = React.useState(initial.nextActionNote);
  const [pending, startTransition] = React.useTransition();

  const dirty =
    (ownerId === NO_OWNER ? null : ownerId) !== initial.ownerId ||
    day !== initial.nextActionAt ||
    note.trim() !== initial.nextActionNote;

  function save() {
    startTransition(async () => {
      const result = await updateLeadRecord(clientId, {
        ownerId: ownerId === NO_OWNER ? null : ownerId,
        nextActionAt: day || null,
        nextActionNote: note.trim() || null,
      });
      if (result.ok) {
        toast.success(result.message ?? "Saved.");
        router.refresh();
      } else {
        toast.error("Nothing was changed", { description: result.message });
      }
    });
  }

  return (
    <form
      className="space-y-3"
      onSubmit={(event) => {
        event.preventDefault();
        save();
      }}
    >
      <label className="block space-y-1.5">
        <span className={FIELD_LABEL}>Owner</span>
        <Select value={ownerId} onValueChange={setOwnerId}>
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Nobody yet" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={NO_OWNER}>Nobody yet</SelectItem>
            {admins.map((admin) => (
              <SelectItem key={admin.id} value={admin.id}>
                {admin.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </label>
      <div className="block space-y-1.5">
        <span className={FIELD_LABEL}>Next action on</span>
        <DateField value={day} onChange={setDay} ariaLabel="Next action date" />
        {day && (
          <button
            type="button"
            className="text-meta text-muted-foreground hover:text-foreground hover:underline"
            onClick={() => {
              setDay("");
              setNote("");
            }}
          >
            Clear the next action
          </button>
        )}
      </div>
      <label className="block space-y-1.5">
        <span className={FIELD_LABEL}>What to do</span>
        <Textarea
          value={note}
          rows={2}
          maxLength={500}
          onChange={(event) => setNote(event.target.value)}
          placeholder="Call back about the timeline"
        />
      </label>
      <Button type="submit" variant="outline" disabled={!dirty || pending}>
        {pending && <LoadingIcon size="sm" />}
        Save lead record
      </Button>
    </form>
  );
}
