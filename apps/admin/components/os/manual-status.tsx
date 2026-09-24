"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ChevronDown, PenLine } from "lucide-react";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
  Input,
  LoadingIcon,
  SegmentedControl,
} from "@repo/ui";

import { cn } from "@/lib/utils";
import { MANUAL_CHANNELS, MANUAL_CHANNEL_LABELS, type ManualChannel } from "@/lib/manual-record";

/**
 * Recording by hand what happened outside the system (see
 * `lib/manual-record.ts`).
 *
 * This sits NEXT TO the automated send, never in place of it: the system send
 * stays the primary button, and this is the secondary path for the day the
 * transport is not configured or the conversation happened in a room. Every
 * dialog states that nothing is sent from here, because an operator who
 * believes "Sent" just messaged the client would never follow up.
 */

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
    hint: "Signed on paper or returned as a scan. This opens the project and its payment schedule, and cannot be undone.",
    confirm: "Record signature",
    channel: true,
    signer: true,
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
    (option) => option.status !== status,
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

export function ManualOnboardingButton({ contractId }: { contractId: string }) {
  const [open, setOpen] = React.useState(false);
  return (
    <>
      <Button variant="outline" onClick={() => setOpen(true)}>
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

/** Matches the `SegmentedControl` legend, so every label in the dialog reads as one set. */
const FIELD_LABEL = "block text-meta font-medium text-muted-foreground";

/** One minute, in milliseconds — `getTimezoneOffset()` returns minutes. */
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
  const [busy, setBusy] = React.useState(false);

  const canSubmit = !busy && (!option.signer || signer.trim().length > 0);

  async function run() {
    setBusy(true);
    try {
      const payload: Record<string, unknown> = {};
      if (option.status !== "ONBOARDED") payload.status = option.status;
      if (option.channel && channel) payload.channel = channel;
      // Today means "now", so the recorded time keeps its hour; an earlier day
      // is stored as that day.
      if (option.date && day && day !== today()) payload.occurredAt = day;
      if (option.signer) payload.signedByName = signer.trim();
      if (note.trim()) payload.note = note.trim();

      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = (await response.json()) as {
        success?: boolean;
        message?: string;
        issues?: { message: string }[];
      };
      if (!response.ok || !data.success) {
        throw new Error(data.issues?.[0]?.message || data.message || `Request failed (${response.status})`);
      }
      toast.success("Recorded", { description: option.title });
      router.refresh();
      onClose();
    } catch (error) {
      toast.error("Could not record it", {
        description:
          error instanceof Error
            ? `${error.message} Nothing was changed.`
            : "Unknown error. Nothing was changed.",
      });
    } finally {
      setBusy(false);
    }
  }

  return (
    <AlertDialog open onOpenChange={(next) => !next && !busy && onClose()}>
      <AlertDialogContent className="max-w-lg">
        <AlertDialogHeader>
          <AlertDialogTitle>{option.title}</AlertDialogTitle>
          <AlertDialogDescription>{option.hint}</AlertDialogDescription>
        </AlertDialogHeader>

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
              <Input
                type="date"
                value={day}
                max={today()}
                onChange={(event) => setDay(event.target.value)}
                className="w-44"
              />
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

        <AlertDialogFooter>
          <AlertDialogCancel disabled={busy}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            variant={option.destructive ? "destructive" : "brand"}
            disabled={!canSubmit}
            onClick={(event) => {
              event.preventDefault();
              void run();
            }}
          >
            {busy && <LoadingIcon size="sm" />}
            {option.confirm}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
