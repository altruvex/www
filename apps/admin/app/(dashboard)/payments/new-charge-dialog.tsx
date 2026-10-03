"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Plus } from "lucide-react";
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
  Input,
  LoadingIcon,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@repo/ui";
import { createCharge } from "@/app/(dashboard)/_actions/billing";
import { localToday } from "./record-payment-dialog";

/**
 * "New charge": a one-off payment against a project or a retainer, with an
 * amount the operator types. The amount is operator data — a figure agreed
 * with the client, like a rush fee or a domain reimbursement — and never a
 * published price; published prices are resolved from the pricing schema at
 * the point the schedule is built, not typed here.
 */

const FIELD_LABEL = "block text-meta font-medium text-muted-foreground";

export interface ChargeTarget {
  /** "project:<id>" or "retainer:<id>" — one select, two record kinds. */
  value: string;
  label: string;
  /** The currency the row will bill in, shown beside the amount. */
  currency: string;
}

export function NewChargeButton({ targets }: { targets: ChargeTarget[] }) {
  const [open, setOpen] = React.useState(false);
  return (
    <>
      <Button
        variant="brand"
        size="sm"
        onClick={() => setOpen(true)}
        disabled={targets.length === 0}
        title={targets.length === 0 ? "A charge bills against a project or a retainer — neither exists yet" : undefined}
      >
        <Plus className="size-3.5" />
        New charge
      </Button>
      {open && <NewChargeDialog targets={targets} onClose={() => setOpen(false)} />}
    </>
  );
}

function NewChargeDialog({ targets, onClose }: { targets: ChargeTarget[]; onClose: () => void }) {
  const router = useRouter();
  const [target, setTarget] = React.useState(targets[0]?.value ?? "");
  const [amount, setAmount] = React.useState("");
  const [dueOn, setDueOn] = React.useState(localToday);
  const [description, setDescription] = React.useState("");
  const [busy, setBusy] = React.useState(false);

  const picked = targets.find((t) => t.value === target);
  const amountValue = Number(amount);
  const canSubmit =
    Boolean(picked) && Number.isInteger(amountValue) && amountValue > 0 && dueOn !== "" && description.trim() !== "";

  async function run() {
    if (!picked) return;
    const [kind, id] = picked.value.split(":");
    setBusy(true);
    try {
      const result = await createCharge({
        projectId: kind === "project" ? id : null,
        subscriptionId: kind === "retainer" ? id : null,
        amount: amountValue,
        dueOn,
        description,
      });
      if (!result.ok) {
        toast.error("Charge not opened", { description: result.message });
        return;
      }
      toast.success("Charge opened", { description: `${description.trim()} · ${picked.label}` });
      router.push(`/payments?payment=${result.paymentId}`);
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
          <AlertDialogTitle>New charge</AlertDialogTitle>
          <AlertDialogDescription>
            Opens a pending payment on the schedule. Nothing is sent to the client from here; issue
            the invoice when it is ready.
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="space-y-3">
          <label className="block space-y-1.5">
            <span className={FIELD_LABEL}>Bill to</span>
            <Select value={target} onValueChange={setTarget}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Project or retainer" />
              </SelectTrigger>
              <SelectContent>
                {targets.map((t) => (
                  <SelectItem key={t.value} value={t.value}>
                    {t.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </label>

          <div className="grid grid-cols-2 gap-3">
            <label className="block space-y-1.5">
              <span className={FIELD_LABEL}>Amount{picked ? ` (${picked.currency})` : ""}</span>
              <Input
                type="number"
                inputMode="numeric"
                min={1}
                step={1}
                value={amount}
                onChange={(event) => setAmount(event.target.value)}
                placeholder="0"
                autoFocus
              />
            </label>
            <label className="block space-y-1.5">
              <span className={FIELD_LABEL}>Due on</span>
              <Input type="date" value={dueOn} onChange={(event) => setDueOn(event.target.value)} />
            </label>
          </div>

          <label className="block space-y-1.5">
            <span className={FIELD_LABEL}>What for</span>
            <Input
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              maxLength={120}
              placeholder="Rush fee, domain renewal, extra round…"
              autoComplete="off"
            />
            <span className="block text-meta text-subtle-foreground">
              Appears as the line on the invoice.
            </span>
          </label>
        </div>

        <AlertDialogFooter>
          <AlertDialogCancel disabled={busy}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            variant="brand"
            disabled={busy || !canSubmit}
            onClick={(event) => {
              event.preventDefault();
              void run();
            }}
          >
            {busy && <LoadingIcon size="sm" />}
            Open charge
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
