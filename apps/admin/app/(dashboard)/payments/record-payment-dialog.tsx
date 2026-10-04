"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  Input,
  Label,
  LoadingIcon,
  SegmentedControl,
} from "@repo/ui";
import { DateField } from "@/components/os/date-field";
import {
  recordPayment,
  recordPayments,
} from "@/app/(dashboard)/_actions/billing";
import {
  PAYMENT_METHODS,
  PAYMENT_METHOD_LABEL,
  isPaymentMethod,
  type PaymentMethod,
} from "@/lib/payment-source";

const MINUTE_MS = 60_000;

const METHOD_KEY = "avx.payment.method";

function rememberedMethod(): PaymentMethod {
  try {
    const saved = window.localStorage.getItem(METHOD_KEY);
    return saved && isPaymentMethod(saved) ? saved : "bank_transfer";
  } catch {
    return "bank_transfer";
  }
}

function rememberMethod(method: PaymentMethod) {
  try {
    window.localStorage.setItem(METHOD_KEY, method);
  } catch {
  }
}

export function localToday() {
  const now = new Date();
  return new Date(now.getTime() - now.getTimezoneOffset() * MINUTE_MS)
    .toISOString()
    .slice(0, 10);
}

export interface RecordPaymentTarget {
  id: string;
  label: string;
  amountLabel?: string;
  reference?: string | null;
  previousPaidOn?: string | null;
}

export function RecordPaymentDialog({
  target,
  targets,
  summary,
  onClose,
}: {
  target?: RecordPaymentTarget;
  targets?: RecordPaymentTarget[];
  summary?: string;
  onClose: () => void;
}) {
  const router = useRouter();
  const list = targets ?? (target ? [target] : []);
  const bulk = list.length > 1;
  const only = bulk ? undefined : list[0];
  const previousDay = only?.previousPaidOn ?? null;
  const [day, setDay] = React.useState(() => previousDay ?? localToday());
  const [method, setMethod] = React.useState<PaymentMethod>(rememberedMethod);
  const [reference, setReference] = React.useState(only?.reference ?? "");
  const [busy, setBusy] = React.useState(false);
  const [refusal, setRefusal] = React.useState<string | null>(null);
  const referenceId = React.useId();

  async function run() {
    setBusy(true);
    setRefusal(null);
    try {
      if (bulk) {
        const result = await recordPayments(
          list.map((t) => t.id),
          { paidOn: day, method },
        );
        if (!result.ok) {
          setRefusal(result.message ?? "Nothing was recorded.");
          return;
        }
        toast.success(result.message ?? "Payments recorded.");
      } else {
        if (!only) return;
        const result = await recordPayment(only.id, {
          paidOn: day,
          method,
          reference,
        });
        if (!result.ok) {
          setRefusal(result.message);
          return;
        }
        toast.success("Payment recorded", {
          description: only.label,
          action: {
            label: "Open invoice",
            onClick: () => router.push(`/invoices?inspect=${only.id}`),
          },
        });
      }
      rememberMethod(method);
      router.refresh();
      onClose();
    } finally {
      setBusy(false);
    }
  }

  return (
    <AlertDialog open onOpenChange={(next) => !next && !busy && onClose()}>
      <AlertDialogContent className="max-w-lg">
        <AlertDialogHeader>
          <AlertDialogTitle>
            {bulk ? `Record ${list.length} payments` : "Record payment"}
          </AlertDialogTitle>
          <AlertDialogDescription>
            {bulk
              ? `${summary ?? `${list.length} payments`}. Each is marked paid with the same day and method; the audit trail keeps one change per payment.`
              : `${[only?.label, only?.amountLabel].filter(Boolean).join(" · ")}. Marks it paid with the day the money arrived; the audit trail keeps the change.`}
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="space-y-3">
          <div className="space-y-1.5">
            <span className="block text-meta font-medium text-muted-foreground">Received on</span>
            <DateField
              ariaLabel="Received on"
              value={day}
              max={localToday()}
              onChange={setDay}
              className="w-44"
            />
            {previousDay !== null && day === previousDay && (
              <p className="text-meta text-subtle-foreground">
                The day it was recorded paid before it was set back to pending.
                Change it if the money arrived on another day.
              </p>
            )}
          </div>

          {!bulk && only?.amountLabel && (
            <div className="space-y-1.5">
              <span className="block text-meta font-medium text-muted-foreground">
                Amount
              </span>
              <p className="text-sm font-medium tabular-nums">
                {only.amountLabel}
              </p>
              <p className="text-meta text-subtle-foreground">
                What this payment is owed. It is marked paid as one sum; a
                different figure means the charge itself needs changing first.
              </p>
            </div>
          )}

          <SegmentedControl
            label="How"
            options={PAYMENT_METHODS.map((value) => ({
              value,
              label: PAYMENT_METHOD_LABEL[value],
            }))}
            value={method}
            onChange={(value) => setMethod(value as PaymentMethod)}
          />

          {!bulk && (
            <div className="space-y-1.5">
              <Label htmlFor={referenceId}>Reference (optional)</Label>
              <Input
                id={referenceId}
                value={reference}
                onChange={(event) => setReference(event.target.value)}
                maxLength={120}
                placeholder="Transfer id, cheque number…"
                autoComplete="off"
              />
            </div>
          )}

          {bulk && (
            <ul className="max-h-40 space-y-0.5 overflow-y-auto text-meta text-muted-foreground">
              {list.map((t) => (
                <li key={t.id} className="truncate">
                  {t.label}
                </li>
              ))}
            </ul>
          )}

          {refusal && (
            <p role="alert" className="text-meta text-danger">
              {refusal}
            </p>
          )}
        </div>

        <AlertDialogFooter>
          <AlertDialogCancel disabled={busy}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            variant="brand"
            disabled={busy || !day}
            onClick={(event) => {
              event.preventDefault();
              void run();
            }}
          >
            {busy && <LoadingIcon size="sm" />}
            {bulk ? `Mark ${list.length} paid` : "Mark paid"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
