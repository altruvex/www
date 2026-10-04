"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Ban, Check, FileText, RotateCcw } from "lucide-react";
import { Button } from "@repo/ui";
import { ConfirmDialog } from "@/components/os/confirm-dialog";
import { issueInvoice, reopenPayment, waivePayment } from "@/app/(dashboard)/_actions/billing";
import { RecordPaymentDialog } from "./record-payment-dialog";

export function PaymentInspectorActions({
  row,
  canEdit = true,
}: {
  row: {
    id: string;
    label: string;
    status: string;
    amountLabel: string;
    reference: string | null;
    invoiceNumber: string | null;
    previousPaidOn: string | null;
    paidOnLabel?: string | null;
  };
  canEdit?: boolean;
}) {
  const router = useRouter();
  const [recording, setRecording] = React.useState(false);
  const [busy, startTransition] = React.useTransition();

  const unpaid = row.status === "PENDING" || row.status === "OVERDUE";
  const canIssue = !row.invoiceNumber && row.status !== "WAIVED";
  const settled = row.status === "PAID" || row.status === "WAIVED";
  if (!canEdit || (!unpaid && !canIssue && !settled)) return null;

  function issue() {
    startTransition(async () => {
      const result = await issueInvoice(row.id);
      if (!result.ok) {
        toast.error("Invoice not issued", { description: result.message });
        return;
      }
      toast.success(`Issued ${result.invoiceNumber}`, {
        description: row.label,
      });
      router.refresh();
    });
  }

  return (
    <div className="flex flex-wrap gap-2">
      {unpaid && (
        <Button variant="brand" size="sm" onClick={() => setRecording(true)}>
          <Check className="size-3.5" />
          Record payment
        </Button>
      )}
      {canIssue && (
        <Button variant="outline" size="sm" onClick={issue} disabled={busy}>
          <FileText className="size-3.5" />
          Issue invoice
        </Button>
      )}
      {unpaid && (
        <ConfirmDialog
          trigger={
            <Button variant="destructive-ghost" size="sm">
              <Ban className="size-3.5" />
              Waive
            </Button>
          }
          tone="danger"
          title="Waive this payment?"
          body={row.label}
          consequence={`${row.amountLabel} will no longer be owed. The audit trail keeps the change, and the payment can be set back to pending from the list.`}
          confirmLabel="Waive"
          onConfirm={async () => {
            const result = await waivePayment(row.id);
            if (result.ok) router.refresh();
            return result;
          }}
        />
      )}
      {settled && (
        <ConfirmDialog
          trigger={
            <Button variant="outline" size="sm">
              <RotateCcw className="size-3.5" />
              Set back to pending
            </Button>
          }
          title="Set back to pending?"
          body={row.label}
          consequence={
            row.status === "PAID"
              ? `${row.amountLabel} reads as owed again${row.paidOnLabel ? ` and the paid date (${row.paidOnLabel}) is cleared` : ""}. The audit trail keeps it, and recording the payment again offers that day back.`
              : `${row.amountLabel} reads as owed again.`
          }
          confirmLabel="Set pending"
          onConfirm={async () => {
            const result = await reopenPayment(row.id);
            if (result.ok) router.refresh();
            return result.ok
              ? { ok: true, message: "Set back to pending." }
              : result;
          }}
        />
      )}
      {recording && (
        <RecordPaymentDialog
          target={{
            id: row.id,
            label: row.label,
            amountLabel: row.amountLabel,
            reference: row.reference,
            previousPaidOn: row.previousPaidOn,
          }}
          onClose={() => setRecording(false)}
        />
      )}
    </div>
  );
}
