"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { ChevronDown, PenLine } from "lucide-react";

import {
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
  Input,
  SegmentedControl,
} from "@repo/ui";

import { ConfirmDialog, type ConfirmResult } from "@/components/os/confirm-dialog";
import { DateField } from "@/components/os/date-field";
import { cn } from "@/lib/utils";
import { MANUAL_CHANNELS, MANUAL_CHANNEL_LABELS, type ManualChannel } from "@/lib/manual-record";

type Entity = "proposal" | "contract";

interface ManualOption {
  status: string;
  label: string;
  title: string;
  hint: string;
  confirm: string;
  channel?: boolean;
  date?: boolean;
  signer?: boolean;
  destructive?: boolean;
  consequence?: string;
}

const PROPOSAL_OPTIONS: ManualOption[] = [
  {
    status: "SENT",
    label: "Sent outside the system",
    title: "Record the proposal as sent",
    hint: "You handed it over or sent it from your own inbox or phone. Nothing is sent from here.",
    confirm: "Record as sent",
    channel: true,
    date: true,
  },
  {
    status: "ACCEPTED",
    label: "Accepted",
    title: "Record the proposal as accepted",
    hint: "The client agreed to this offer. The contract can be generated next.",
    confirm: "Record as accepted",
    channel: true,
    date: true,
  },
  {
    status: "REJECTED",
    label: "Rejected",
    title: "Record the proposal as rejected",
    hint: "The client turned this offer down.",
    confirm: "Record as rejected",
    channel: true,
    date: true,
    destructive: true,
  },
  {
    status: "EXPIRED",
    label: "Expired",
    title: "Mark the proposal expired",
    hint: "The price is no longer committed.",
    confirm: "Mark expired",
    destructive: true,
  },
  {
    status: "DRAFT",
    label: "Back to draft",
    title: "Move the proposal back to draft",
    hint: "Clears the sent and answered dates. Use it when a status was recorded by mistake.",
    confirm: "Move to draft",
  },
];

const CONTRACT_OPTIONS: ManualOption[] = [
  {
    status: "SENT",
    label: "Sent outside the system",
    title: "Record the contract as sent",
    hint: "You sent it from your own inbox or phone, or handed it over. Nothing is sent from here — the signing link keeps working.",
    confirm: "Record as sent",
    channel: true,
  },
  {
    status: "SIGNED",
    label: "Signed",
    title: "Record the signature",
    hint: "Signed on paper or returned as a scan.",
    confirm: "Record signature",
    channel: true,
    signer: true,
    destructive: true,
    consequence:
      "This cannot be undone. It opens the project with its three-payment schedule (the deposit due today), opens any services in the proposal as pending, and tries the WhatsApp onboarding message if none has been sent.",
  },
  {
    status: "DECLINED",
    label: "Declined",
    title: "Record the contract as declined",
    hint: "The client will not sign. The signing link stops accepting signatures.",
    confirm: "Record as declined",
    channel: true,
    destructive: true,
  },
  {
    status: "EXPIRED",
    label: "Expired",
    title: "Mark the contract expired",
    hint: "The signing link stops accepting signatures.",
    confirm: "Mark expired",
    destructive: true,
  },
  {
    status: "DRAFT",
    label: "Back to draft",
    title: "Move the contract back to draft",
    hint: "Use it when a status was recorded by mistake.",
    confirm: "Move to draft",
  },
];

const ONBOARDING_OPTION: ManualOption = {
  status: "ONBOARDED",
  label: "Client onboarded",
  title: "Record the onboarding conversation",
  hint: "You told the client what happens next yourself — a call, a message, the kickoff. Nothing is sent from here.",
  confirm: "Record onboarding",
  channel: true,
  date: true,
};

export function ManualStatusMenu({
  entity,
  id,
  status,
  size,
}: {
  entity: Entity;
  id: string;
  status: string;
  size?: "sm";
}) {
  const [picked, setPicked] = React.useState<ManualOption | null>(null);
  const options = (entity === "proposal" ? PROPOSAL_OPTIONS : CONTRACT_OPTIONS).filter(
    (option) => option.status !== status && (option.status !== "SENT" || status === "DRAFT"),
  );

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size={size}>
            <PenLine className="size-3.5 text-subtle-foreground" />
            Record manually
            <ChevronDown className="size-3" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-64">
          <DropdownMenuLabel>Set status by hand</DropdownMenuLabel>
          {options.map((option) => (
            <DropdownMenuItem
              key={option.status}
              destructive={option.destructive}
              onSelect={() => setPicked(option)}
            >
              {option.label}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>

      {picked && (
        <ManualDialog
          option={picked}
          endpoint={`/api/admin/${entity}s/${id}/status`}
          onClose={() => setPicked(null)}
        />
      )}
    </>
  );
}

export function ManualOnboardingButton({
  contractId,
  size,
}: {
  contractId: string;
  size?: "sm";
}) {
  const [open, setOpen] = React.useState(false);
  return (
    <>
      <Button variant="outline" size={size} onClick={() => setOpen(true)}>
        <PenLine className="size-3.5 text-subtle-foreground" />
        Record onboarding
      </Button>
      {open && (
        <ManualDialog
          option={ONBOARDING_OPTION}
          endpoint={`/api/admin/contracts/${contractId}/onboarding`}
          onClose={() => setOpen(false)}
        />
      )}
    </>
  );
}

const FIELD_LABEL = "block text-meta font-medium text-muted-foreground";

const MINUTE_MS = 60_000;

function today() {
  const now = new Date();
  const offset = now.getTimezoneOffset() * MINUTE_MS;
  return new Date(now.getTime() - offset).toISOString().slice(0, 10);
}

function ManualDialog({
  option,
  endpoint,
  onClose,
}: {
  option: ManualOption;
  endpoint: string;
  onClose: () => void;
}) {
  const router = useRouter();
  const [channel, setChannel] = React.useState<ManualChannel | null>(null);
  const [day, setDay] = React.useState(today());
  const [signer, setSigner] = React.useState("");
  const [note, setNote] = React.useState("");

  async function run(): Promise<ConfirmResult> {
    const payload: Record<string, unknown> = {};
    if (option.status !== "ONBOARDED") payload.status = option.status;
    if (option.channel && channel) payload.channel = channel;
    if (option.date && day && day !== today()) payload.occurredAt = day;
    if (option.signer) payload.signedByName = signer.trim();
    if (note.trim()) payload.note = note.trim();

    const response = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = (await response.json().catch(() => ({}))) as {
      success?: boolean;
      message?: string;
      issues?: { message: string }[];
    };
    if (!response.ok || !data.success) {
      const reason =
        data.issues?.[0]?.message || data.message || `Request failed (${response.status}).`;
      return { ok: false, message: `${reason} Nothing was changed.` };
    }
    router.refresh();
    return { ok: true, message: `Recorded: ${option.label.toLowerCase()}` };
  }

  return (
    <ConfirmDialog
      open
      onOpenChange={(next) => {
        if (!next) onClose();
      }}
      title={option.title}
      body={option.hint}
      consequence={option.consequence}
      confirmLabel={option.confirm}
      tone={option.destructive ? "danger" : "default"}
      confirmDisabled={option.signer === true && signer.trim().length === 0}
      width="lg"
      onConfirm={run}
    >
      <div className="space-y-3">
        {option.signer && (
          <label className="block space-y-1.5">
            <span className={FIELD_LABEL}>Signed by</span>
            <Input
              value={signer}
              onChange={(event) => setSigner(event.target.value)}
              maxLength={200}
              autoComplete="off"
              autoFocus
            />
            <span className="block text-meta text-subtle-foreground">
              Recorded on the contract. It cannot be edited afterwards.
            </span>
          </label>
        )}

        {option.channel && (
          <SegmentedControl
            label="How did it happen? (optional)"
            options={MANUAL_CHANNELS.map((value) => ({
              value,
              label: MANUAL_CHANNEL_LABELS[value],
            }))}
            value={channel}
            onChange={(value) => setChannel((current) => (current === value ? null : value))}
          />
        )}

        {option.date && (
          <label className="block space-y-1.5">
            <span className={FIELD_LABEL}>When</span>
            <DateField value={day} max={today()} onChange={setDay} className="w-44" />
          </label>
        )}

        <label className="block space-y-1.5">
          <span className={FIELD_LABEL}>Note (optional)</span>
          <textarea
            value={note}
            onChange={(event) => setNote(event.target.value)}
            rows={2}
            maxLength={500}
            placeholder="Kept in the audit trail"
            className={cn(
              "w-full rounded-ctl border border-border bg-background px-3 py-2 text-base",
              "outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50",
            )}
          />
        </label>
      </div>
    </ConfirmDialog>
  );
}
