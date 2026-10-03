"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Check, FileText } from "lucide-react";
import { Button } from "@repo/ui";
import { issueInvoice } from "@/app/(dashboard)/_actions/billing";
import { RecordPaymentDialog } from "./record-payment-dialog";

/**
 * The actions on the focused payment (`?payment=<id>`): the same two the row
 * menu offers, as visible buttons, because the operator who followed a link
 * to this payment came to do one of them.
 */
export function FocusedPaymentActions({
  row,
}: {
  row: { id: string; label: string; status: string; reference: string | null; invoiceNumber: string | null };
}) {
  const router = useRouter();
  const [recording, setRecording] = React.useState(false);
  const [busy, startTransition] = React.useTransition();

  const unpaid = row.status === "PENDING" || row.status === "OVERDUE";
  const canIssue = !row.invoiceNumber && row.status !== "WAIVED";
  if (!unpaid && !canIssue) return null;

  function issue() {
    startTransition(async () => {
      const result = await issueInvoice(row.id);
      if (!result.ok) {
        toast.error("Invoice not issued", { description: result.message });
        return;
      }
      toast.success(`Issued ${result.invoiceNumber}`, { description: row.label });
      router.refresh();
    });
  }

  return (
    <div className="flex shrink-0 flex-wrap gap-2">
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
      {recording && (
        <RecordPaymentDialog
          target={{ id: row.id, label: row.label, reference: row.reference }}
          onClose={() => setRecording(false)}
        />
      )}
    </div>
  );
}
