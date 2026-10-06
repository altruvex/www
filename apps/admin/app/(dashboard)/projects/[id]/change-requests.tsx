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
  Hint,
  Input,
  LoadingIcon,
  SegmentedControl,
  Sheet,
  SheetBody,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  Textarea,
} from "@repo/ui";

import { useSheetSide } from "@/app/(dashboard)/calendar/sheet-shell";
import { EmptyInline } from "@/components/os/empty-state";
import { DateField } from "@/components/os/date-field";
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
  warrantyEligible: boolean;
  payment: { id: string; status: string } | null;
  quoteToken: string | null;
  quoteSentAt: string | null;
  quoteSentVia: string | null;
  quoteViewedAt: string | null;
  quoteExpiresAt: string | null;
  respondedByName: string | null;
  clientResponseNote: string | null;
}

export interface QuoteSending {
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

async function settle(action: () => Promise<ActionResult<unknown>>): Promise<{ ok: boolean; message?: string }> {
  try {
    const outcome = await action();
    return outcome.ok ? { ok: true } : { ok: false, message: outcome.message };
  } catch {
    return { ok: false, message: "The request failed before the server answered." };
  }
}

export function ChangeRequestsPanel({
  projectId,
  currency,
  rate,
  warrantyDays,
  closed,
  rows,
  sending,
  finance,
  canEdit,
  canPrice,
}: {
  projectId: string;
  currency: string;
  rate: number | null;
  warrantyDays: number;
  closed: boolean;
  rows: ChangeRequestRow[];
  sending: QuoteSending;
  finance: boolean;
  canEdit: boolean;
  canPrice: boolean;
}) {
  const [dialog, setDialog] = React.useState<Dialog | null>(null);
  const close = () => setDialog(null);

  return (
    <>
      <div className="plane overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border-subtle px-3 py-2">
          <p className="min-w-0 flex-1 text-meta text-muted-foreground">
            {closed
              ? "The project is closed. Changes can still be logged, quoted and billed here."
              : "One-off paid work outside the contract — no retainer needed."}
          </p>
          {canEdit && (
            <Button size="sm" variant="outline" className="pointer-coarse:h-11" onClick={() => setDialog({ kind: "new" })}>
              <Plus className="size-3.5" />
              New request
            </Button>
          )}
        </div>
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
              <RequestRow
                key={row.id}
                row={row}
                currency={currency}
                baseUrl={sending.baseUrl}
                finance={finance}
                canEdit={canEdit}
                canPrice={canPrice}
                open={setDialog}
              />
            ))}
          </ul>
        )}
      </div>

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

function pricingLine(row: ChangeRequestRow, currency: string): string | null {
  if (row.pricing === "WARRANTY") return "Warranty · no charge";
  if (row.pricing === "FIXED") return "Fixed quote";
  if (row.pricing === "HOURLY") {
    const hours = row.actualMinutes ?? row.estimatedMinutes;
    if (hours == null) return null;
    const verb = row.actualMinutes != null ? "actual" : "estimated";
    return row.hourlyRate != null
      ? `${formatHours(hours)} ${verb} × ${money(row.hourlyRate, currency)}`
      : `${formatHours(hours)} ${verb}`;
  }
  return null;
}

function RequestRow({
  row,
  currency,
  baseUrl,
  finance,
  canEdit,
  canPrice,
  open,
}: {
  row: ChangeRequestRow;
  currency: string;
  baseUrl: string | null;
  finance: boolean;
  canEdit: boolean;
  canPrice: boolean;
  open: (dialog: Dialog) => void;
}) {
  const router = useRouter();
  const [busy, startTransition] = React.useTransition();
  const amount = row.billedAmount ?? row.quotedAmount;
  const pricing = pricingLine(row, currency);

  const run = (label: string, action: () => Promise<ActionResult<unknown>>) =>
    startTransition(async () => {
      const result = await settle(action);
      if (!result.ok) {
        toast.error(`${result.message} Nothing was changed.`);
        return;
      }
      toast.success(label);
      router.refresh();
    });

  let primary: React.ReactNode = null;
  const menu: { label: string; onSelect: () => void; destructive?: boolean }[] = [];
  const recordApproval = {
    label: "Record approval",
    onSelect: () => open({ kind: "decision", row, decision: "APPROVED" }),
  };
  const recordDeclined = {
    label: "Record declined",
    onSelect: () => open({ kind: "decision", row, decision: "DECLINED" }),
  };

  switch (row.status) {
    case "REQUESTED":
      if (canPrice) {
        primary = <Button size="sm" variant="outline" onClick={() => open({ kind: "quote", row })}>Quote</Button>;
      }
      if (canEdit && row.warrantyEligible) {
        menu.push({
          label: "Cover under warranty",
          onSelect: () => run("Covered under warranty", () => coverChangeRequestUnderWarranty(row.id)),
        });
      }
      if (canEdit) menu.push(recordDeclined);
      break;
    case "QUOTED":
      if (row.quoteSentAt) {
        if (canEdit) {
          primary = (
            <Button size="sm" variant="outline" onClick={recordApproval.onSelect}>
              Record approval
            </Button>
          );
        }
        if (canPrice) menu.push({ label: "Resend quote", onSelect: () => open({ kind: "send", row }) });
        if (canPrice && baseUrl && row.quoteToken) {
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
      } else if (canPrice) {
        primary = (
          <Button size="sm" variant="outline" onClick={() => open({ kind: "send", row })}>
            Send quote
          </Button>
        );
        menu.push(recordApproval);
      } else if (canEdit) {
        primary = (
          <Button size="sm" variant="outline" onClick={recordApproval.onSelect}>
            Record approval
          </Button>
        );
      }
      if (canPrice) menu.push({ label: "Re-quote", onSelect: () => open({ kind: "quote", row }) });
      if (canEdit) menu.push(recordDeclined);
      break;
    case "APPROVED":
      if (canEdit) {
        primary = (
          <Button size="sm" variant="outline" disabled={busy} onClick={() => run("Work started", () => startChangeRequest(row.id))}>
            {busy && <LoadingIcon size="sm" />}
            Start work
          </Button>
        );
      }
      break;
    case "IN_PROGRESS":
      if (canPrice) {
        primary = <Button size="sm" variant="outline" onClick={() => open({ kind: "deliver", row })}>Deliver</Button>;
      } else if (canEdit) {
        primary = (
          <Hint label="Delivery bills the client — an admin or owner records it">
            <span className="inline-flex">
              <Button size="sm" variant="outline" disabled aria-disabled>
                Deliver
              </Button>
            </span>
          </Hint>
        );
      }
      break;
  }
  if (canEdit && isOpen(row.status)) {
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
          <p className="mt-1 border-s-2 border-border-subtle ps-2 text-meta text-muted-foreground">
            “{row.clientResponseNote}”
          </p>
        )}
      </div>

      <div className="flex shrink-0 items-center gap-2">
        {finance && amount != null && (
          <span className="font-mono text-md tabular-nums">{money(amount, currency)}</span>
        )}
        {row.payment && finance ? (
          <Hint label="Open the payment">
            <Link
              href={`/payments?inspect=${row.payment.id}`}
              className="rounded-xs"
              aria-label="Open the payment"
            >
              <StatusPill registry="paymentStatus" value={row.payment.status} />
            </Link>
          </Hint>
        ) : row.payment ? (
          <StatusPill registry="paymentStatus" value={row.payment.status} />
        ) : (
          <StatusPill registry="changeRequestStatus" value={row.status} />
        )}
        {primary}
        {menu.length > 0 && (
          // Not modal: a modal menu that opens a modal dialog leaves body pointer-events stuck at none.
          <DropdownMenu modal={false}>
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

function useSubmit(onClose: () => void) {
  const router = useRouter();
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const submit = async (label: string, action: () => Promise<ActionResult<unknown>>) => {
    setBusy(true);
    setError(null);
    const result = await settle(action);
    setBusy(false);
    if (!result.ok) {
      setError(`${result.message} Nothing was changed.`);
      return;
    }
    toast.success(label);
    router.refresh();
    onClose();
  };
  return { busy, submit, error };
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
  error,
  asSheet = false,
  children,
}: {
  title: string;
  description: React.ReactNode;
  busy: boolean;
  canSubmit: boolean;
  confirm: string;
  dismiss?: string;
  secondary?: { label: string; onClick: () => void };
  destructive?: boolean;
  onConfirm: () => void;
  onClose: () => void;
  error?: string | null;
  asSheet?: boolean;
  children?: React.ReactNode;
}) {
  const sheet = useSheetSide();
  const errorLine = error ? (
    <p role="alert" className="text-meta text-danger">
      {error}
    </p>
  ) : null;
  const commit = (
    <>
      {secondary && (
        <Button
          variant="outline"
          className="pointer-coarse:h-11"
          disabled={busy || !canSubmit}
          onClick={secondary.onClick}
        >
          {secondary.label}
        </Button>
      )}
    </>
  );

  if (asSheet) {
    return (
      <Sheet open onOpenChange={(next) => !next && !busy && onClose()}>
        <SheetContent side={sheet.side} width="md" className={sheet.className}>
          <SheetHeader>
            <SheetTitle>{title}</SheetTitle>
            <SheetDescription>{description}</SheetDescription>
          </SheetHeader>
          <SheetBody className="space-y-3 overflow-y-auto">
            {children}
            {errorLine}
          </SheetBody>
          <SheetFooter>
            <Button variant="ghost" className="pointer-coarse:h-11" disabled={busy} onClick={onClose}>
              {dismiss}
            </Button>
            {commit}
            <Button
              variant={destructive ? "destructive" : "brand"}
              className="pointer-coarse:h-11"
              disabled={busy || !canSubmit}
              onClick={onConfirm}
            >
              {busy && <LoadingIcon size="sm" />}
              {confirm}
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    );
  }

  return (
    <AlertDialog open onOpenChange={(next) => !next && !busy && onClose()}>
      <AlertDialogContent className="max-w-lg">
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>{description}</AlertDialogDescription>
        </AlertDialogHeader>
        {children && <div className="space-y-3">{children}</div>}
        {errorLine}
        <AlertDialogFooter>
          <AlertDialogCancel disabled={busy}>{dismiss}</AlertDialogCancel>
          {commit}
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
  const { busy, submit, error } = useSubmit(onClose);
  const [title, setTitle] = React.useState("");
  const [detail, setDetail] = React.useState("");

  return (
    <DialogShell
      asSheet
      title="Log a change request"
      description="What the client asked for, in their words. It is priced in the next step."
      busy={busy}
      error={error}
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
      <Field label="Detail (optional)">
        <Textarea
          value={detail}
          onChange={(event) => setDetail(event.target.value)}
          rows={4}
          maxLength={4000}
        />
      </Field>
    </DialogShell>
  );
}

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
  onSend: (row: ChangeRequestRow) => void;
}) {
  const router = useRouter();
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
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
    setError(null);
    try {
      const result = await quoteChangeRequest(
        row.id,
        mode === "HOURLY"
          ? { pricing: "HOURLY", estimatedHours: hoursValue ?? 0 }
          : { pricing: "FIXED", amount: Math.round(amountValue ?? 0) },
      );
      if (!result.ok) {
        setError(`${result.message} Nothing was changed.`);
        return;
      }
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
    } catch {
      setError("The request failed before the server answered. Nothing was changed.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <DialogShell
      asSheet
      title={row.status === "QUOTED" ? "Re-quote the request" : "Quote the request"}
      description={
        <>
          <span className="font-medium text-foreground">{row.title}</span>. Set the price, then send
          it to the client as a quote they can open and approve.
          {row.quoteSentAt && " The quote already sent stops accepting an answer until this one is sent."}
        </>
      }
      busy={busy}
      error={error}
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
  const { busy, submit, error } = useSubmit(onClose);
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
      error={error}
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
      <Field label="When">
        <DateField value={day} max={today()} onChange={setDay} className="w-44" />
      </Field>
      <Field label="Note (optional)">
        <Textarea
          value={note}
          onChange={(event) => setNote(event.target.value)}
          rows={2}
          maxLength={500}
          placeholder="Kept in the audit trail"
        />
      </Field>
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
  const { busy, submit, error } = useSubmit(onClose);
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
      error={error}
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
  const { busy, submit, error } = useSubmit(onClose);
  const canEmail = sending.emailConfigured && Boolean(sending.clientEmail);
  const [channel, setChannel] = React.useState<"email" | "whatsapp">(
    canEmail || !sending.whatsappConfigured ? "email" : "whatsapp",
  );

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
      asSheet
      title={row.quoteSentAt ? "Resend the quote" : "Send the quote"}
      description={
        <>
          {money(row.quotedAmount, currency)} for{" "}
          <span className="font-medium text-foreground">{row.title}</span>. The client gets a link to
          review it and approve or decline; their answer lands on this row.
        </>
      }
      busy={busy}
      error={error}
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
      <Field label="Message">
        <Textarea
          value={body}
          onChange={(event) => setBody(event.target.value)}
          rows={11}
          maxLength={10000}
          className="font-mono text-meta leading-relaxed"
        />
      </Field>
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
  const { busy, submit, error } = useSubmit(onClose);
  const [note, setNote] = React.useState("");

  return (
    <DialogShell
      title="Cancel the request"
      description={`${row.title}. It stays on the project as cancelled, and nothing is billed.`}
      busy={busy}
      error={error}
      canSubmit
      confirm="Cancel request"
      dismiss="Keep it"
      destructive
      onClose={onClose}
      onConfirm={() => submit("Request cancelled", () => cancelChangeRequest(row.id, note))}
    >
      <Field label="Why (optional)">
        <Textarea
          value={note}
          onChange={(event) => setNote(event.target.value)}
          rows={2}
          maxLength={500}
          placeholder="Kept in the audit trail"
        />
      </Field>
    </DialogShell>
  );
}
