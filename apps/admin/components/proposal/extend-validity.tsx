"use client";

import * as React from "react";
import { CalendarClock } from "lucide-react";
import { Button, SegmentedControl } from "@repo/ui";
import { ConfirmDialog } from "@/components/os/confirm-dialog";
import { extendProposalValidity } from "@/app/(dashboard)/_actions/proposals";
import { VALIDITY_EXTENSIONS } from "@/app/(dashboard)/proposals/reissue";
import { date } from "@/lib/format";

const DAY_MS = 86_400_000;

export function ExtendValidityButton({
  proposalId,
  validUntil,
  size,
  variant = "outline",
}: {
  proposalId: string;
  validUntil: string;
  size?: "sm";
  variant?: "outline" | "ghost";
}) {
  const [days, setDays] = React.useState<number>(14);
  const [now] = React.useState(() => Date.now());
  const base = Math.max(now, new Date(validUntil).getTime());
  const expired = new Date(validUntil).getTime() < now;

  return (
    <ConfirmDialog
      trigger={
        <Button type="button" variant={variant} size={size}>
          <CalendarClock className="size-3.5" aria-hidden />
          Extend validity
        </Button>
      }
      title="Extend this proposal's validity?"
      body={
        expired
          ? `It expired on ${date(validUntil)}. The new date counts from today.`
          : `It is valid until ${date(validUntil)}. The new date counts from then.`
      }
      consequence="Only the date on this record and in its content moves. The PDF the client already has is not regenerated and still prints the old date — tell them."
      confirmLabel={`Extend by ${days} days`}
      onConfirm={() => extendProposalValidity(proposalId, days)}
    >
      <SegmentedControl
        label="Extend by"
        options={VALIDITY_EXTENSIONS.map((option) => ({
          value: String(option),
          label: `+${option} days · ${date(new Date(base + option * DAY_MS))}`,
        }))}
        value={String(days)}
        onChange={(value) => setDays(Number(value))}
      />
    </ConfirmDialog>
  );
}
