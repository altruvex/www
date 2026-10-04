"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Panel } from "@/components/os/panel";
import { statusOf } from "@/lib/status";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@repo/ui";
import { updateSubmissionTriage } from "../actions";

type TriageInput = Parameters<typeof updateSubmissionTriage>[0];

const STATUSES = ["NEW", "VIEWED", "CONTACTED", "QUALIFIED", "PROPOSAL_SENT", "WON", "LOST", "SPAM"];
const PRIORITIES = ["LOW", "MEDIUM", "HIGH", "URGENT"];
const UNASSIGNED = "__none";

export interface TeamOption {
  id: string;
  label: string;
}

export function TriagePanel({
  submissionId,
  status,
  priority,
  assignedToId,
  team,
}: {
  submissionId: string;
  status: string;
  priority: string;
  assignedToId: string | null;
  team: TeamOption[];
}) {
  const router = useRouter();
  const [pending, startTransition] = React.useTransition();
  const [values, setValues] = React.useState({
    status,
    priority,
    assignedToId: assignedToId ?? UNASSIGNED,
  });

  function save(patch: Partial<typeof values>) {
    const previous = values;
    const next = { ...values, ...patch };
    setValues(next);
    startTransition(async () => {
      const result = await updateSubmissionTriage({
        id: submissionId,
        ...(patch.status !== undefined && { status: patch.status as NonNullable<TriageInput["status"]> }),
        ...(patch.priority !== undefined && { priority: patch.priority as NonNullable<TriageInput["priority"]> }),
        ...(patch.assignedToId !== undefined && {
          assignedToId: patch.assignedToId === UNASSIGNED ? null : patch.assignedToId,
        }),
      });
      if (!result.ok) {
        setValues(previous);
        toast.error("Could not save", { description: result.message });
        return;
      }
      toast.success(result.message);
      router.refresh();
    });
  }

  return (
    <Panel title="Triage" description="Who owns this and how urgent it is" bodyClassName="space-y-3">
      <Field label="Status">
        <Select value={values.status} onValueChange={(v) => save({ status: v })} disabled={pending}>
          <SelectTrigger aria-label="Status">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {STATUSES.map((s) => (
              <SelectItem key={s} value={s}>
                {statusOf("submissionStatus", s).label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </Field>
      <Field label="Priority">
        <Select
          value={values.priority}
          onValueChange={(v) => save({ priority: v })}
          disabled={pending}
        >
          <SelectTrigger aria-label="Priority">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {PRIORITIES.map((p) => (
              <SelectItem key={p} value={p}>
                {statusOf("priority", p).label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </Field>
      <Field label="Assigned to">
        <Select
          value={values.assignedToId}
          onValueChange={(v) => save({ assignedToId: v })}
          disabled={pending}
        >
          <SelectTrigger aria-label="Assigned to">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={UNASSIGNED}>Unassigned</SelectItem>
            {team.map((member) => (
              <SelectItem key={member.id} value={member.id}>
                {member.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </Field>
    </Panel>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <span className="telemetry text-subtle-foreground">{label}</span>
      {children}
    </div>
  );
}
