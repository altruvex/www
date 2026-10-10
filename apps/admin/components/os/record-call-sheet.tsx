"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { PhoneCall } from "lucide-react";

import {
  Button,
  Input,
  LoadingIcon,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Sheet,
  SheetBody,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
  Textarea,
} from "@repo/ui";

import { recordCallOutcome } from "@/app/(dashboard)/_actions/call-outcome";
import { DateField } from "@/components/os/date-field";
import { LostReasonFields, useLostInput } from "@/components/os/lost-reason-fields";
import { CALL_OUTCOME_LABELS, CALL_OUTCOMES, optionsOf, type CallOutcomeValue } from "@/lib/status";
import {
  addWorkingDaysKey,
  businessDayKey,
  NURTURE_REVIEW_DAYS,
  workingDayAfterKey,
} from "@/lib/working-days";

const FIELD_LABEL = "telemetry block text-subtle-foreground";

/** Today's business day; every date below is a "YYYY-MM-DD" key on the business calendar. */
const today = () => businessDayKey(new Date());

/** The first working day at least `days` calendar days from today. */
const workingDayFromToday = (days: number) => workingDayAfterKey(today(), days);

/** The date each outcome starts with; the person can change it. */
function defaultDay(outcome: CallOutcomeValue | ""): string {
  // Shared working-week rule (lib/working-days.ts): Friday and Saturday are off.
  if (outcome === "PROPOSAL_REQUIRED") return addWorkingDaysKey(today(), 2);
  if (outcome === "FOLLOW_UP") return workingDayFromToday(7);
  if (outcome === "NURTURE") return workingDayFromToday(NURTURE_REVIEW_DAYS);
  return "";
}

const NOTE_DEFAULT: Partial<Record<CallOutcomeValue, string>> = {
  PROPOSAL_REQUIRED: "Send proposal",
  NURTURE: "Review nurture",
};

/**
 * "Record the call": what a call decided, picked by the person who took it
 * (docs/sales-os.md R7/R8). The outcome completes the meeting and moves the
 * linked client; nothing here is inferred.
 */
export function RecordCallSheet({
  meetingId,
  meetingTitle,
  client,
  closedReason,
  triggerLabel = "Record the call",
  triggerVariant = "outline",
}: {
  meetingId: string;
  meetingTitle: string;
  /** The linked client, or null when the meeting has none. */
  client: { label: string } | null;
  /** Why the client is closed to sales moves (signed, spam), or null. */
  closedReason: string | null;
  triggerLabel?: string;
  triggerVariant?: "outline" | "brand" | "ghost";
}) {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [outcome, setOutcome] = React.useState<CallOutcomeValue | "">("");
  const [day, setDay] = React.useState("");
  const [note, setNote] = React.useState("");
  const [nurtureReason, setNurtureReason] = React.useState("");
  const [notes, setNotes] = React.useState("");
  const lost = useLostInput();
  const [result, setResult] = React.useState<{ ok: boolean; message: string } | null>(null);
  const [busy, startTransition] = React.useTransition();

  const movesClient = Boolean(client) && !closedReason;
  const needsClient = outcome !== "" && outcome !== "NO_FURTHER_ACTION" && !client;
  const needsDay =
    movesClient && (outcome === "PROPOSAL_REQUIRED" || outcome === "FOLLOW_UP" || outcome === "NURTURE");

  function reset() {
    setOutcome("");
    setDay("");
    setNote("");
    setNurtureReason("");
    setNotes("");
    lost.reset();
    setResult(null);
  }

  function pick(next: CallOutcomeValue) {
    setOutcome(next);
    setDay(defaultDay(next));
    setNote(NOTE_DEFAULT[next] ?? "");
    setResult(null);
  }

  const missing =
    outcome === ""
      ? "Pick what the call decided."
      : needsClient
        ? "Link a client to this meeting first — this outcome moves the client."
        : needsDay && !day
          ? "Pick a date."
          : movesClient && outcome === "NURTURE" && !nurtureReason
            ? "Pick why this lead is parked."
            : movesClient && outcome === "LOST" && !lost.ready
              ? "Pick a reason before marking this lost."
              : null;

  function save() {
    if (missing || outcome === "") return;
    startTransition(async () => {
      let res: { ok: boolean; message: string };
      try {
        res = await recordCallOutcome({
          meetingId,
          outcome,
          notes,
          nextActionAt: needsDay ? day : null,
          nextActionNote: needsDay ? note : null,
          lostReason: outcome === "LOST" ? lost.value.reason : null,
          lostNote: outcome === "LOST" ? lost.value.note : null,
          nurtureReason: outcome === "NURTURE" ? nurtureReason : null,
        });
      } catch {
        res = { ok: false, message: "The server refused the change. Nothing was changed." };
      }
      setResult(res);
      if (res.ok) {
        toast.success(res.message);
        setOpen(false);
        reset();
        router.refresh();
      }
    });
  }

  const dayLabel =
    outcome === "PROPOSAL_REQUIRED"
      ? "Send the proposal by"
      : outcome === "NURTURE"
        ? "Review this lead again on"
        : "Follow up on";

  return (
    <Sheet
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) reset();
      }}
    >
      <SheetTrigger asChild>
        <Button type="button" size="sm" variant={triggerVariant} className="pointer-coarse:h-11">
          <PhoneCall className="size-3.5" />
          {triggerLabel}
        </Button>
      </SheetTrigger>
      <SheetContent side="end" className="w-full sm:max-w-lg">
        <SheetHeader>
          <SheetTitle>Record the call</SheetTitle>
          <SheetDescription>
            {meetingTitle}
            {client ? ` · ${client.label}` : ""}. Saving marks the meeting completed with this
            outcome.
          </SheetDescription>
        </SheetHeader>

        <SheetBody className="space-y-4">
          {closedReason && (
            <p className="text-meta text-muted-foreground">
              {closedReason} The outcome is kept on the meeting; the client is left as it is.
            </p>
          )}

          <fieldset className="space-y-1.5">
            <legend className={FIELD_LABEL}>What did the call decide?</legend>
            <div className="divide-y divide-border-subtle rounded-md border border-border">
              {CALL_OUTCOMES.map((value) => {
                const def = CALL_OUTCOME_LABELS[value];
                const id = `call-outcome-${meetingId}-${value}`;
                return (
                  <label
                    key={value}
                    htmlFor={id}
                    className="flex cursor-pointer items-start gap-3 px-3 py-2.5 has-[:checked]:bg-brand-soft"
                  >
                    <input
                      id={id}
                      type="radio"
                      name={`call-outcome-${meetingId}`}
                      value={value}
                      checked={outcome === value}
                      onChange={() => pick(value)}
                      className="mt-1 size-4 accent-brand"
                      aria-describedby={`${id}-hint`}
                    />
                    <span className="min-w-0">
                      <span className="block text-base font-medium">{def.label}</span>
                      <span id={`${id}-hint`} className="block text-meta text-muted-foreground">
                        {def.hint}
                      </span>
                    </span>
                  </label>
                );
              })}
            </div>
          </fieldset>

          {needsClient && (
            <p className="text-meta text-warning">
              This meeting has no client linked. Link one first, or pick “No further action”.
            </p>
          )}

          {movesClient && outcome === "NURTURE" && (
            <label className="block space-y-1">
              <span className={FIELD_LABEL}>Why park it?</span>
              <Select value={nurtureReason} onValueChange={setNurtureReason}>
                <SelectTrigger className="w-full" aria-label="Why park it?">
                  <SelectValue placeholder="Pick a reason" />
                </SelectTrigger>
                <SelectContent>
                  {optionsOf("lostReason").map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </label>
          )}

          {movesClient && outcome === "LOST" && (
            <LostReasonFields value={lost.value} onChange={lost.setValue} />
          )}

          {needsDay && (
            <section className="space-y-3 border-t border-border-subtle pt-3">
              <div className="space-y-1">
                <span className={FIELD_LABEL}>{dayLabel}</span>
                <DateField value={day} onChange={setDay} min={today()} ariaLabel={dayLabel} />
              </div>
              <label className="block space-y-1">
                <span className={FIELD_LABEL}>What to do then</span>
                <Input
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  maxLength={500}
                  placeholder="Check whether they decided"
                />
              </label>
            </section>
          )}

          {movesClient && (outcome === "LOST" || outcome === "NO_FURTHER_ACTION") && (
            <p className="text-meta text-subtle-foreground">
              Clears the client&apos;s next action date, so no follow-up alert is raised.
            </p>
          )}

          <label className="block space-y-1 border-t border-border-subtle pt-3">
            <span className={FIELD_LABEL}>Call notes (optional)</span>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={4}
              maxLength={1000}
              placeholder="What they said, what they need, who decides"
            />
            <span className="block text-meta text-subtle-foreground">
              Added to the meeting&apos;s internal notes.
            </span>
          </label>
        </SheetBody>

        <SheetFooter className="flex-wrap justify-between">
          <p
            role="status"
            aria-live="polite"
            className={result && !result.ok ? "text-meta text-danger" : "text-meta text-muted-foreground"}
          >
            {result?.message ?? (outcome ? missing ?? "" : "")}
          </p>
          <Button type="button" variant="brand" disabled={busy || Boolean(missing)} onClick={save}>
            {busy && <LoadingIcon size="sm" />}
            {busy ? "Saving…" : "Save outcome"}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
