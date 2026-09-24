"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Mail, MessageCircle, MoreHorizontal, Plus } from "lucide-react";

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
  DropdownMenuTrigger,
  Field,
  Input,
  LoadingIcon,
  SegmentedControl,
} from "@repo/ui";

import { Panel } from "@/components/os/panel";
import { EmptyInline } from "@/components/os/empty-state";
import { StatusPill } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { date, money } from "@/lib/format";
import { MANUAL_CHANNELS, MANUAL_CHANNEL_LABELS, type ManualChannel } from "@/lib/manual-record";
import {
  formatHours,
  hourlyAmount,
  hoursToMinutes,
  isOpen,
  quoteDraftFor,
  quoteExpiry,
} from "@/lib/change-requests";
import {
  cancelChangeRequest,
  coverChangeRequestUnderWarranty,
  createChangeRequest,
  deliverChangeRequest,
  quoteChangeRequest,
  recordChangeRequestDecision,
  sendChangeRequestQuote,
  startChangeRequest,
  type ActionResult,
} from "@/app/(dashboard)/_actions/change-requests";

/**
 * Change requests on one project — paid one-off work for a client with no
 * maintenance retainer (rules: `lib/change-requests.ts`).
 *
 * Each row shows exactly one next step as a button, because a request always
 * has one obvious next move (quote it, record the answer, start, deliver); the
 * rarer moves sit in the overflow menu. Nothing here sends anything to the
 * client — the dialogs say so where it matters.
 */

export interface ChangeRequestRow {
  id: string;
  title: string;
  detail: string | null;
  status: string;
  pricing: string | null;
  estimatedMinutes: number | null;
  actualMinutes: number | null;
  hourlyRate: number | null;
  quotedAmount: number | null;
  billedAmount: number | null;
  requestedAt: string;
  deliveredAt: string | null;
  /** Whether the request date falls inside the warranty window. */
  warrantyEligible: boolean;
  payment: { status: string } | null;
  quoteToken: string | null;
  quoteSentAt: string | null;
  quoteSentVia: string | null;
  quoteViewedAt: string | null;
  quoteExpiresAt: string | null;
  respondedByName: string | null;
  clientResponseNote: string | null;
}

/** What sending a quote needs from the server: where links point, and what can deliver today. */
export interface QuoteSending {
  /** Null when no public base URL can be built (BETTER_AUTH_URL unset in production). */
  baseUrl: string | null;
  validityDays: number;
  clientName: string | null;
  clientEmail: string | null;
  clientPhone: string | null;
  emailConfigured: boolean;
  whatsappConfigured: boolean;
}

type Dialog =
  | { kind: "new" }
  | { kind: "quote"; row: ChangeRequestRow }
  | { kind: "send"; row: ChangeRequestRow }
  | { kind: "decision"; row: ChangeRequestRow; decision: "APPROVED" | "DECLINED" }
  | { kind: "deliver"; row: ChangeRequestRow }
  | { kind: "cancel"; row: ChangeRequestRow };

const FIELD_LABEL = "block text-meta font-medium text-muted-foreground";

/** Server actions return their refusal rather than throwing it; surface it as an error here. */
async function unwrap(result: Promise<ActionResult<unknown>>) {
  const outcome = await result;
  if (!outcome.ok) throw new Error(outcome.message);
}

const textareaClass = cn(
  "w-full rounded-ctl border border-border bg-background px-3 py-2 text-base",
  "outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50",
);

export function ChangeRequestsPanel({
  projectId,
  currency,
  rate,
  warrantyDays,
  closed,
  rows,
  sending,
}: {
  projectId: string;
  currency: string;
  /** The published hourly rate for this project's currency; null when none exists. */
  rate: number | null;
  warrantyDays: number;
  closed: boolean;
  rows: ChangeRequestRow[];
  sending: QuoteSending;
}) {
  const [dialog, setDialog] = React.useState<Dialog | null>(null);
  const close = () => setDialog(null);

  return (
    <>
      <Panel
        title="Change requests"
        description={
          closed
            ? "The project is closed. Changes can still be logged, quoted and billed here."
            : "One-off paid work outside the contract — no retainer needed."
        }
        action={
          <Button size="sm" variant="outline" onClick={() => setDialog({ kind: "new" })}>
            <Plus className="size-3.5" />
            New request
          </Button>
        }
        flush
      >
        {rows.length === 0 ? (
          <EmptyInline>
            Nothing requested yet. When the client asks for a change and has no maintenance
            plan, log it here: it gets quoted at the published rate
            {rate != null ? ` (${money(rate, currency)} / hour)` : ""}, recorded when they
            agree, and billed on delivery. Requests inside the {warrantyDays}-day post-launch
            warranty can be covered for free.
          </EmptyInline>
        ) : (
          <ul className="rows">
            {rows.map((row) => (
              <RequestRow key={row.id} row={row} currency={currency} baseUrl={sending.baseUrl} open={setDialog} />
            ))}
          </ul>
        )}
      </Panel>

      {dialog?.kind === "new" && <NewRequestDialog projectId={projectId} onClose={close} />}
      {dialog?.kind === "quote" && (
        <QuoteDialog
          row={dialog.row}
          currency={currency}
          rate={rate}
          onClose={close}
          onSend={(next) => setDialog({ kind: "send", row: next })}
        />
      )}
      {dialog?.kind === "send" && (
        <SendQuoteDialog row={dialog.row} currency={currency} sending={sending} onClose={close} />
      )}
      {dialog?.kind === "decision" && (
        <DecisionDialog row={dialog.row} decision={dialog.decision} currency={currency} onClose={close} />
      )}
      {dialog?.kind === "deliver" && (
        <DeliverDialog row={dialog.row} currency={currency} onClose={close} />
      )}
      {dialog?.kind === "cancel" && <CancelDialog row={dialog.row} onClose={close} />}
    </>
  );
}

/* -------------------------------------------------------------------------- */
/* Row                                                                        */
/* -------------------------------------------------------------------------- */

function pricingLine(row: ChangeRequestRow, currency: string): string | null {
  if (row.pricing === "WARRANTY") return "Warranty · no charge";
  if (row.pricing === "FIXED") return "Fixed quote";
  if (row.pricing === "HOURLY" && row.hourlyRate != null) {
    const hours = row.actualMinutes ?? row.estimatedMinutes;
    const verb = row.actualMinutes != null ? "actual" : "estimated";
    return `${formatHours(hours)} ${verb} × ${money(row.hourlyRate, currency)}`;
  }
  return null;
}

function RequestRow({
  row,
  currency,
  baseUrl,
  open,
}: {
  row: ChangeRequestRow;
  currency: string;
  baseUrl: string | null;
  open: (dialog: Dialog) => void;
}) {
  const router = useRouter();
  const [busy, startTransition] = React.useTransition();
  const amount = row.billedAmount ?? row.quotedAmount;
  const pricing = pricingLine(row, currency);

  const run = (label: string, action: () => Promise<ActionResult<unknown>>) =>
    startTransition(async () => {
      try {
        await unwrap(action());
        toast.success(label);
        router.refresh();
      } catch (error) {
        toast.error("Could not update the request", {
          description: error instanceof Error ? error.message : "Unknown error",
        });
      }
    });

  let primary: React.ReactNode = null;
  const menu: { label: string; onSelect: () => void; destructive?: boolean }[] = [];

  switch (row.status) {
    case "REQUESTED":
      primary = <Button size="sm" variant="outline" onClick={() => open({ kind: "quote", row })}>Quote</Button>;
      if (row.warrantyEligible) {
        menu.push({
          label: "Cover under warranty",
          onSelect: () => run("Covered under warranty", () => coverChangeRequestUnderWarranty(row.id)),
        });
      }
      menu.push({ label: "Record declined", onSelect: () => open({ kind: "decision", row, decision: "DECLINED" }) });
      break;
    case "QUOTED":
      if (row.quoteSentAt) {
        primary = (
          <Button size="sm" variant="outline" onClick={() => open({ kind: "decision", row, decision: "APPROVED" })}>
            Record approval
          </Button>
        );
        menu.push({ label: "Resend quote", onSelect: () => open({ kind: "send", row }) });
        if (baseUrl && row.quoteToken) {
          const link = `${baseUrl}/quote/${row.quoteToken}`;
          menu.push({
            label: "Copy quote link",
            onSelect: () =>
              void navigator.clipboard.writeText(link).then(
                () => toast.success("Quote link copied"),
                () => toast.error("Copy failed", { description: link }),
              ),
          });
        }
      } else {
        primary = (
          <Button size="sm" variant="outline" onClick={() => open({ kind: "send", row })}>
            Send quote
          </Button>
        );
        menu.push({ label: "Record approval", onSelect: () => open({ kind: "decision", row, decision: "APPROVED" }) });
      }
      menu.push({ label: "Re-quote", onSelect: () => open({ kind: "quote", row }) });
      menu.push({ label: "Record declined", onSelect: () => open({ kind: "decision", row, decision: "DECLINED" }) });
      break;
    case "APPROVED":
      primary = (
        <Button size="sm" variant="outline" disabled={busy} onClick={() => run("Work started", () => startChangeRequest(row.id))}>
          {busy && <LoadingIcon size="sm" />}
          Start work
        </Button>
      );
      break;
    case "IN_PROGRESS":
      primary = <Button size="sm" variant="outline" onClick={() => open({ kind: "deliver", row })}>Deliver</Button>;
      break;
  }
  if (isOpen(row.status)) {
    menu.push({ label: "Cancel request", onSelect: () => open({ kind: "cancel", row }), destructive: true });
  }

  return (
    <li className="flex flex-wrap items-start gap-x-3 gap-y-2 px-3 py-2.5">
      <div className="min-w-0 flex-1 basis-60">
        <p className="text-base font-medium">{row.title}</p>
        {row.detail && (
          <p className="mt-0.5 line-clamp-2 whitespace-pre-line text-meta text-muted-foreground">{row.detail}</p>
        )}
        <p className="mt-1 font-mono text-micro text-subtle-foreground">
          REQUESTED {date(row.requestedAt).toUpperCase()}
          {row.deliveredAt && ` · DELIVERED ${date(row.deliveredAt).toUpperCase()}`}
          {pricing && ` · ${pricing.toUpperCase()}`}
        </p>
        {row.status === "QUOTED" && (
          <p className="mt-0.5 font-mono text-micro text-subtle-foreground">
            {row.quoteSentAt ? (
              <>
                QUOTE SENT {date(row.quoteSentAt).toUpperCase()}
                {row.quoteSentVia && ` BY ${row.quoteSentVia === "email" ? "EMAIL" : "WHATSAPP"}`}
                {row.quoteViewedAt ? (
                  <span className="text-info"> · OPENED {date(row.quoteViewedAt).toUpperCase()}</span>
                ) : (
                  " · NOT OPENED YET"
                )}
                {row.quoteExpiresAt && ` · VALID UNTIL ${date(row.quoteExpiresAt).toUpperCase()}`}
              </>
            ) : (
              <span className="text-warning">QUOTE NOT SENT TO THE CLIENT</span>
            )}
          </p>
        )}
        {row.respondedByName && (
          <p className="mt-0.5 font-mono text-micro text-subtle-foreground">
            APPROVED ON THE QUOTE PAGE BY {row.respondedByName.toUpperCase()}
          </p>
        )}
        {row.clientResponseNote && (
          <p className="mt-1 border-s-2 border-border ps-2 text-meta text-muted-foreground">
            “{row.clientResponseNote}”
          </p>
        )}
      </div>

      <div className="flex shrink-0 items-center gap-2">
        {amount != null && (
          <span className="font-mono text-md tabular-nums">{money(amount, currency)}</span>
        )}
        {row.payment ? (
          <Link href="/payments" className="rounded-xs" title="Open payments">
            <StatusPill registry="paymentStatus" value={row.payment.status} />
          </Link>
        ) : (
          <StatusPill registry="changeRequestStatus" value={row.status} />
        )}
        {primary}
        {menu.length > 0 && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button size="icon-sm" variant="ghost" aria-label={`More actions for ${row.title}`} disabled={busy}>
                <MoreHorizontal className="size-3.5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {menu.map((item) => (
                <DropdownMenuItem key={item.label} destructive={item.destructive} onSelect={item.onSelect}>
                  {item.label}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>
    </li>
  );
}

/* -------------------------------------------------------------------------- */
/* Dialogs                                                                    */
/* -------------------------------------------------------------------------- */

function useSubmit(onClose: () => void) {
  const router = useRouter();
  const [busy, setBusy] = React.useState(false);
  const submit = async (label: string, action: () => Promise<ActionResult<unknown>>) => {
    setBusy(true);
    try {
      await unwrap(action());
      toast.success(label);
      router.refresh();
      onClose();
    } catch (error) {
      toast.error("Could not save it", {
        description:
          error instanceof Error ? `${error.message} Nothing was changed.` : "Unknown error. Nothing was changed.",
      });
    } finally {
      setBusy(false);
    }
  };
  return { busy, submit };
}

function DialogShell({
  title,
  description,
  busy,
  canSubmit,
  confirm,
  dismiss = "Cancel",
  secondary,
  destructive,
  onConfirm,
  onClose,
  children,
}: {
  title: string;
  description: React.ReactNode;
  busy: boolean;
  canSubmit: boolean;
  confirm: string;
  dismiss?: string;
  /** A second, non-primary commit beside the confirm button. */
  secondary?: { label: string; onClick: () => void };
  destructive?: boolean;
  onConfirm: () => void;
  onClose: () => void;
  children?: React.ReactNode;
}) {
  return (
    <AlertDialog open onOpenChange={(next) => !next && !busy && onClose()}>
      <AlertDialogContent className="max-w-lg">
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>{description}</AlertDialogDescription>
        </AlertDialogHeader>
        {children && <div className="space-y-3">{children}</div>}
        <AlertDialogFooter>
          <AlertDialogCancel disabled={busy}>{dismiss}</AlertDialogCancel>
          {secondary && (
            <Button variant="outline" disabled={busy || !canSubmit} onClick={secondary.onClick}>
              {secondary.label}
            </Button>
          )}
          <AlertDialogAction
            variant={destructive ? "destructive" : "brand"}
            disabled={busy || !canSubmit}
            onClick={(event) => {
              event.preventDefault();
              onConfirm();
            }}
          >
            {busy && <LoadingIcon size="sm" />}
            {confirm}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

function NewRequestDialog({ projectId, onClose }: { projectId: string; onClose: () => void }) {
  const { busy, submit } = useSubmit(onClose);
  const [title, setTitle] = React.useState("");
  const [detail, setDetail] = React.useState("");

  return (
    <DialogShell
      title="Log a change request"
      description="What the client asked for, in their words. It is priced in the next step."
      busy={busy}
      canSubmit={title.trim().length > 0}
      confirm="Log request"
      onClose={onClose}
      onConfirm={() =>
        submit("Change request logged", () => createChangeRequest(projectId, { title, detail }))
      }
    >
      <Field label="Request">
        <Input
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          maxLength={200}
          placeholder="Add a second language switcher to the footer"
          autoFocus
        />
      </Field>
      <label className="block space-y-1.5">
        <span className={FIELD_LABEL}>Detail (optional)</span>
        <textarea
          value={detail}
          onChange={(event) => setDetail(event.target.value)}
          rows={4}
          maxLength={4000}
          className={textareaClass}
        />
      </label>
    </DialogShell>
  );
}

/** Parses a typed number; empty or invalid reads as null rather than zero. */
function parseNumber(value: string): number | null {
  if (value.trim() === "") return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function QuoteDialog({
  row,
  currency,
  rate,
  onClose,
  onSend,
}: {
  row: ChangeRequestRow;
  currency: string;
  rate: number | null;
  onClose: () => void;
  /** Called with the freshly quoted row when the operator chose to send it straight away. */
  onSend: (row: ChangeRequestRow) => void;
}) {
  const router = useRouter();
  const [busy, setBusy] = React.useState(false);
  const [mode, setMode] = React.useState<"HOURLY" | "FIXED">(
    row.pricing === "FIXED" || rate == null ? "FIXED" : "HOURLY",
  );
  const [hours, setHours] = React.useState(
    row.estimatedMinutes != null ? String(row.estimatedMinutes / 60) : "",
  );
  const [amount, setAmount] = React.useState(
    row.pricing === "FIXED" && row.quotedAmount != null ? String(row.quotedAmount) : "",
  );

  const hoursValue = parseNumber(hours);
  const amountValue = parseNumber(amount);
  const preview =
    mode === "HOURLY" && rate != null && hoursValue != null && hoursValue > 0
      ? hourlyAmount(hoursToMinutes(hoursValue), rate)
      : mode === "FIXED" && amountValue != null && amountValue >= 0
        ? Math.round(amountValue)
        : null;

  async function save(andSend: boolean) {
    setBusy(true);
    try {
      const result = await quoteChangeRequest(
        row.id,
        mode === "HOURLY"
          ? { pricing: "HOURLY", estimatedHours: hoursValue ?? 0 }
          : { pricing: "FIXED", amount: Math.round(amountValue ?? 0) },
      );
      if (!result.ok) throw new Error(result.message);
      router.refresh();
      if (andSend) {
        onSend({
          ...row,
          ...result.data,
          status: "QUOTED",
          quoteSentAt: null,
          quoteSentVia: null,
          quoteViewedAt: null,
          quoteExpiresAt: null,
        });
      } else {
        toast.success("Quote saved", { description: "Not sent yet — send it from the row when ready." });
        onClose();
      }
    } catch (error) {
      toast.error("Could not save the quote", {
        description:
          error instanceof Error ? `${error.message} Nothing was changed.` : "Unknown error. Nothing was changed.",
      });
    } finally {
      setBusy(false);
    }
  }

  return (
    <DialogShell
      title={row.status === "QUOTED" ? "Re-quote the request" : "Quote the request"}
      description={
        <>
          <span className="font-medium text-foreground">{row.title}</span>. Set the price, then send
          it to the client as a quote they can open and approve.
          {row.quoteSentAt && " The quote already sent stops accepting an answer until this one is sent."}
        </>
      }
      busy={busy}
      canSubmit={preview != null}
      confirm={preview != null ? `Save and send ${money(preview, currency)}` : "Save and send"}
      secondary={{ label: "Save only", onClick: () => void save(false) }}
      onClose={onClose}
      onConfirm={() => void save(true)}
    >
      <SegmentedControl
        label="Priced as"
        columns={2}
        options={[
          { value: "HOURLY", label: "By the hour", disabled: rate == null },
          { value: "FIXED", label: "Fixed amount" },
        ]}
        value={mode}
        onChange={setMode}
      />

      {mode === "HOURLY" ? (
        <Field
          label="Estimated hours"
          hint={
            rate != null
              ? `At the published revision rate, ${money(rate, currency)} / hour. Billed on the actual hours at delivery.`
              : undefined
          }
        >
          <Input
            type="number"
            inputMode="decimal"
            min={0.25}
            step={0.25}
            value={hours}
            onChange={(event) => setHours(event.target.value)}
            className="w-40"
            autoFocus
          />
        </Field>
      ) : (
        <Field label={`Amount (${currency})`} hint="Billed as quoted, whatever the hours. Zero records free work.">
          <Input
            type="number"
            inputMode="numeric"
            min={0}
            step={1}
            value={amount}
            onChange={(event) => setAmount(event.target.value)}
            className="w-44"
            autoFocus
          />
        </Field>
      )}

      {rate == null && (
        <p className="text-meta text-muted-foreground">
          No hourly rate is published for {currency}, so this can only be quoted as a fixed amount.
        </p>
      )}
    </DialogShell>
  );
}

function today() {
  const now = new Date();
  const offset = now.getTimezoneOffset() * 60 * 1000;
  return new Date(now.getTime() - offset).toISOString().slice(0, 10);
}

function DecisionDialog({
  row,
  decision,
  currency,
  onClose,
}: {
  row: ChangeRequestRow;
  decision: "APPROVED" | "DECLINED";
  currency: string;
  onClose: () => void;
}) {
  const { busy, submit } = useSubmit(onClose);
  const [channel, setChannel] = React.useState<ManualChannel | null>(null);
  const [day, setDay] = React.useState(today());
  const [note, setNote] = React.useState("");
  const approved = decision === "APPROVED";

  return (
    <DialogShell
      title={approved ? "Record the client's approval" : "Record the request as declined"}
      description={
        approved
          ? `The client agreed to ${row.quotedAmount != null ? money(row.quotedAmount, currency) : "the quote"}. Work can start next.`
          : "The client does not want this change. It closes without billing."
      }
      busy={busy}
      canSubmit
      confirm={approved ? "Record approval" : "Record declined"}
      destructive={!approved}
      onClose={onClose}
      onConfirm={() =>
        submit(approved ? "Approval recorded" : "Recorded as declined", () =>
          recordChangeRequestDecision(row.id, {
            decision,
            ...(channel ? { channel } : {}),
            ...(day && day !== today() ? { occurredAt: day } : {}),
            ...(note.trim() ? { note: note.trim() } : {}),
          }),
        )
      }
    >
      <SegmentedControl
        label="How did they answer? (optional)"
        options={MANUAL_CHANNELS.map((value) => ({ value, label: MANUAL_CHANNEL_LABELS[value] }))}
        value={channel}
        onChange={(value) => setChannel((current) => (current === value ? null : value))}
      />
      <label className="block space-y-1.5">
        <span className={FIELD_LABEL}>When</span>
        <Input type="date" value={day} max={today()} onChange={(event) => setDay(event.target.value)} className="w-44" />
      </label>
      <label className="block space-y-1.5">
        <span className={FIELD_LABEL}>Note (optional)</span>
        <textarea
          value={note}
          onChange={(event) => setNote(event.target.value)}
          rows={2}
          maxLength={500}
          placeholder="Kept in the audit trail"
          className={textareaClass}
        />
      </label>
    </DialogShell>
  );
}

function DeliverDialog({
  row,
  currency,
  onClose,
}: {
  row: ChangeRequestRow;
  currency: string;
  onClose: () => void;
}) {
  const { busy, submit } = useSubmit(onClose);
  const hourly = row.pricing === "HOURLY";
  const [hours, setHours] = React.useState(
    row.estimatedMinutes != null ? String(row.estimatedMinutes / 60) : "",
  );
  const hoursValue = parseNumber(hours);

  const billed =
    row.pricing === "WARRANTY"
      ? 0
      : hourly
        ? row.hourlyRate != null && hoursValue != null && hoursValue > 0
          ? hourlyAmount(hoursToMinutes(hoursValue), row.hourlyRate)
          : null
        : (row.quotedAmount ?? null);

  const drift =
    hourly && billed != null && row.quotedAmount != null ? billed - row.quotedAmount : 0;

  return (
    <DialogShell
      title="Deliver the change"
      description={
        billed == null
          ? "Enter the hours actually spent."
          : billed > 0
            ? `This opens a pending payment of ${money(billed, currency)} on the project, due today. Nothing is sent to the client.`
            : "Delivered at no charge — no payment is opened."
      }
      busy={busy}
      canSubmit={billed != null}
      confirm={billed != null && billed > 0 ? `Deliver and bill ${money(billed, currency)}` : "Deliver"}
      onClose={onClose}
      onConfirm={() =>
        submit("Delivered", () =>
          deliverChangeRequest(row.id, hourly && hoursValue != null ? { actualHours: hoursValue } : {}),
        )
      }
    >
      {hourly && (
        <Field
          label="Actual hours"
          hint={`Estimated ${formatHours(row.estimatedMinutes)} at ${row.hourlyRate != null ? money(row.hourlyRate, currency) : "—"} / hour.`}
        >
          <Input
            type="number"
            inputMode="decimal"
            min={0.25}
            step={0.25}
            value={hours}
            onChange={(event) => setHours(event.target.value)}
            className="w-40"
            autoFocus
          />
        </Field>
      )}
      {drift !== 0 && (
        <p className={cn("text-meta", drift > 0 ? "text-warning" : "text-muted-foreground")}>
          {drift > 0 ? `${money(drift, currency)} over` : `${money(-drift, currency)} under`} the{" "}
          {money(row.quotedAmount, currency)} the client approved.
          {drift > 0 && " Make sure they know before the invoice does."}
        </p>
      )}
    </DialogShell>
  );
}

function SendQuoteDialog({
  row,
  currency,
  sending,
  onClose,
}: {
  row: ChangeRequestRow;
  currency: string;
  sending: QuoteSending;
  onClose: () => void;
}) {
  const { busy, submit } = useSubmit(onClose);
  const canEmail = sending.emailConfigured && Boolean(sending.clientEmail);
  const [channel, setChannel] = React.useState<"email" | "whatsapp">(
    canEmail || !sending.whatsappConfigured ? "email" : "whatsapp",
  );

  // The link shown in the draft is the one the server will append; the server
  // builds its own and re-appends it if this body loses it.
  const link = sending.baseUrl && row.quoteToken ? `${sending.baseUrl}/quote/${row.quoteToken}` : null;
  const draft = React.useMemo(
    () =>
      quoteDraftFor(
        row,
        sending.clientName,
        currency,
        link ?? "",
        quoteExpiry(new Date(), sending.validityDays),
      ),
    [row, sending.clientName, sending.validityDays, currency, link],
  );
  const [subject, setSubject] = React.useState(draft.subject);
  const [body, setBody] = React.useState(draft.body);

  const blocked = !link
    ? "No public link can be built: BETTER_AUTH_URL is not set."
    : channel === "email"
      ? !sending.clientEmail
        ? "This client has no email address on file."
        : !sending.emailConfigured
          ? "No mail transport is configured."
          : null
      : !sending.whatsappConfigured
        ? "WhatsApp is not configured, so nothing can be sent over it."
        : null;

  return (
    <DialogShell
      title={row.quoteSentAt ? "Resend the quote" : "Send the quote"}
      description={
        <>
          {money(row.quotedAmount, currency)} for{" "}
          <span className="font-medium text-foreground">{row.title}</span>. The client gets a link to
          review it and approve or decline; their answer lands on this row.
        </>
      }
      busy={busy}
      canSubmit={blocked == null}
      confirm={channel === "email" ? "Send email" : "Send over WhatsApp"}
      onClose={onClose}
      onConfirm={() =>
        submit(channel === "email" ? `Quote sent to ${sending.clientEmail}` : "Quote sent over WhatsApp", () =>
          sendChangeRequestQuote(row.id, { channel, subject, body }),
        )
      }
    >
      <SegmentedControl
        label="Channel"
        columns={2}
        options={[
          { value: "email", label: "Email" },
          { value: "whatsapp", label: "WhatsApp" },
        ]}
        value={channel}
        onChange={setChannel}
      />
      <p className="flex items-center gap-1.5 text-meta text-muted-foreground">
        {channel === "email" ? (
          <>
            <Mail className="size-3.5 shrink-0" aria-hidden />
            {sending.clientEmail ? `To ${sending.clientEmail}` : "No address on file."}
          </>
        ) : (
          <>
            <MessageCircle className="size-3.5 shrink-0" aria-hidden />
            {sending.clientPhone ? `To ${sending.clientPhone}` : "No number on file."} WhatsApp only
            delivers free text if the client messaged you in the last 24 hours — otherwise Meta
            refuses it and you will see why.
          </>
        )}
      </p>

      {channel === "email" && (
        <Field label="Subject">
          <Input value={subject} onChange={(event) => setSubject(event.target.value)} maxLength={200} />
        </Field>
      )}
      <label className="block space-y-1.5">
        <span className={FIELD_LABEL}>Message</span>
        <textarea
          value={body}
          onChange={(event) => setBody(event.target.value)}
          rows={11}
          maxLength={10000}
          className={cn(textareaClass, "font-mono text-meta leading-relaxed")}
        />
      </label>
      <div className="flex items-center justify-between gap-3">
        <p className="text-meta text-subtle-foreground">Plain text. The link is added back if you remove it.</p>
        <Button
          type="button"
          size="sm"
          variant="ghost"
          onClick={() => {
            setSubject(draft.subject);
            setBody(draft.body);
          }}
        >
          Reset
        </Button>
      </div>
      {blocked && <p className="text-meta text-warning">{blocked}</p>}
    </DialogShell>
  );
}

function CancelDialog({ row, onClose }: { row: ChangeRequestRow; onClose: () => void }) {
  const { busy, submit } = useSubmit(onClose);
  const [note, setNote] = React.useState("");

  return (
    <DialogShell
      title="Cancel the request"
      description={`${row.title}. It stays on the project as cancelled, and nothing is billed.`}
      busy={busy}
      canSubmit
      confirm="Cancel request"
      dismiss="Keep it"
      destructive
      onClose={onClose}
      onConfirm={() => submit("Request cancelled", () => cancelChangeRequest(row.id, note))}
    >
      <label className="block space-y-1.5">
        <span className={FIELD_LABEL}>Why (optional)</span>
        <textarea
          value={note}
          onChange={(event) => setNote(event.target.value)}
          rows={2}
          maxLength={500}
          placeholder="Kept in the audit trail"
          className={textareaClass}
        />
      </label>
    </DialogShell>
  );
}
