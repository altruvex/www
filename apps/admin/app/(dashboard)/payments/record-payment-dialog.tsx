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
  LoadingIcon,
  SegmentedControl,
} from "@repo/ui";
import { recordPayment } from "@/app/(dashboard)/_actions/billing";
import { PAYMENT_METHODS, PAYMENT_METHOD_LABEL, type PaymentMethod } from "@/lib/payment-source";

/**
 * "Record payment": the operator says when the money arrived, how, and under
 * what reference. Nothing is charged from here — the system has no payment
 * provider — so the dialog records a fact the bank statement already holds.
 */

const FIELD_LABEL = "block text-meta font-medium text-muted-foreground";
const MINUTE_MS = 60_000;

export function localToday() {
  const now = new Date();
  return new Date(now.getTime() - now.getTimezoneOffset() * MINUTE_MS).toISOString().slice(0, 10);
}

export interface RecordPaymentTarget {
  id: string;
  /** "Deposit · Acme website" — what the dialog title names. */
  label: string;
  /** Pre-fills the reference field; a renewal already carries its period there. */
  reference?: string | null;
}

export function RecordPaymentDialog({
  target,
  onClose,
}: {
  target: RecordPaymentTarget;
  onClose: () => void;
}) {
  const router = useRouter();
  const [day, setDay] = React.useState(localToday);
  const [method, setMethod] = React.useState<PaymentMethod>("bank_transfer");
  const [reference, setReference] = React.useState(target.reference ?? "");
  const [busy, setBusy] = React.useState(false);

  async function run() {
    setBusy(true);
    try {
      const result = await recordPayment(target.id, { paidOn: day, method, reference });
      if (!result.ok) {
        toast.error("Not recorded", { description: result.message });
        return;
      }
      toast.success("Payment recorded", { description: target.label });
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
          <AlertDialogTitle>Record payment</AlertDialogTitle>
          <AlertDialogDescription>
            {target.label}. Marks it paid with the day the money arrived; the audit trail keeps the
            change.
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="space-y-3">
          <label className="block space-y-1.5">
            <span className={FIELD_LABEL}>Received on</span>
            <Input
              type="date"
              value={day}
              max={localToday()}
              onChange={(event) => setDay(event.target.value)}
              className="w-44"
              autoFocus
            />
          </label>

          <SegmentedControl
            label="How"
            options={PAYMENT_METHODS.map((value) => ({ value, label: PAYMENT_METHOD_LABEL[value] }))}
            value={method}
            onChange={(value) => setMethod(value as PaymentMethod)}
          />

          <label className="block space-y-1.5">
            <span className={FIELD_LABEL}>Reference (optional)</span>
            <Input
              value={reference}
              onChange={(event) => setReference(event.target.value)}
              maxLength={120}
              placeholder="Transfer id, cheque number…"
              autoComplete="off"
            />
          </label>
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
            Mark paid
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
