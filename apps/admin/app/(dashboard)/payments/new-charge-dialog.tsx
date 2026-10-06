"use client";

import * as React from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
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
  Hint,
  Input,
  LoadingIcon,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@repo/ui";
import { createCharge } from "@/app/(dashboard)/_actions/billing";
import { DateField } from "@/components/os/date-field";
import { DatePresetChips, addDays } from "@/components/os/date-preset-chips";
import { localToday } from "./record-payment-dialog";

const FIELD_LABEL = "block text-meta font-medium text-muted-foreground";

const DUE_OFFSETS = [0, 7, 14, 30] as const;
const DUE_OFFSET_KEY = "avx.charge.dueOffset";

function rememberedDueOffset(): number {
  try {
    const saved = Number(window.localStorage.getItem(DUE_OFFSET_KEY));
    return (DUE_OFFSETS as readonly number[]).includes(saved) ? saved : 0;
  } catch {
    return 0;
  }
}

function rememberDueOffset(offset: number) {
  try {
    window.localStorage.setItem(DUE_OFFSET_KEY, String(offset));
  } catch {
  }
}

export interface ChargeTarget {
  value: string;
  label: string;
  currency: string;
  clientId: string;
}

function presetTarget(
  targets: ChargeTarget[],
  preset: { clientId: string | null; projectId: string | null },
): string | undefined {
  if (preset.projectId) {
    const project = targets.find((t) => t.value === `project:${preset.projectId}`);
    if (project) return project.value;
  }
  if (preset.clientId) return targets.find((t) => t.clientId === preset.clientId)?.value;
  return undefined;
}

export function NewChargeButton({
  targets,
  preset,
  scope,
}: {
  targets: ChargeTarget[];
  /** From `?new=charge`: open on arrival with this target chosen. */
  preset?: { clientId: string | null; projectId: string | null } | null;
  /** The client the list is filtered to: the default target when the button is pressed. */
  scope?: { clientId: string | null; projectId: string | null } | null;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [open, setOpen] = React.useState(preset != null && targets.length > 0);
  const initialPreset = preset ?? scope;
  const initialTarget = initialPreset ? presetTarget(targets, initialPreset) : undefined;

  function close() {
    setOpen(false);
    if (searchParams.has("new")) {
      const next = new URLSearchParams(searchParams.toString());
      next.delete("new");
      const query = next.toString();
      router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
    }
  }

  if (targets.length === 0) {
    const reason =
      "A charge bills against a project or a retainer — neither is running yet. Sign a contract or start a retainer first.";
    return (
      <Hint label={reason}>
        <span
          tabIndex={0}
          role="button"
          aria-disabled="true"
          aria-label={`New charge. ${reason}`}
          className="inline-flex cursor-not-allowed rounded-full outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
        >
          <Button variant="brand" size="sm" disabled tabIndex={-1}>
            <Plus className="size-3.5" />
            New charge
          </Button>
        </span>
      </Hint>
    );
  }
  return (
    <>
      <Button variant="brand" size="sm" onClick={() => setOpen(true)}>
        <Plus className="size-3.5" />
        New charge
      </Button>
      {open && (
        <NewChargeDialog
          targets={targets}
          initialTarget={initialTarget}
          onClose={close}
          onCreated={() => setOpen(false)}
        />
      )}
    </>
  );
}

function NewChargeDialog({
  targets,
  initialTarget,
  onClose,
  onCreated,
}: {
  targets: ChargeTarget[];
  initialTarget?: string;
  onClose: () => void;
  onCreated: () => void;
}) {
  const router = useRouter();
  const [target, setTarget] = React.useState(initialTarget ?? targets[0]?.value ?? "");
  const [amount, setAmount] = React.useState("");
  const [today] = React.useState(localToday);
  const [dueOn, setDueOn] = React.useState(() =>
    addDays(today, rememberedDueOffset()),
  );
  const [description, setDescription] = React.useState("");
  const [busy, setBusy] = React.useState(false);

  const picked = targets.find((t) => t.value === target);
  const amountValue = Number(amount);
  const canSubmit =
    Boolean(picked) &&
    Number.isInteger(amountValue) &&
    amountValue > 0 &&
    dueOn !== "" &&
    description.trim() !== "";

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
      toast.success("Charge opened", {
        description: `${description.trim()} · ${picked.label}`,
      });
      router.push(`/payments?inspect=${result.paymentId}`);
      router.refresh();
      onCreated();
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
            Opens a pending payment on the schedule. Nothing is sent to the
            client from here; issue the invoice when it is ready.
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
              <span className={FIELD_LABEL}>
                Amount{picked ? ` (${picked.currency})` : ""}
              </span>
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
            <div className="space-y-1.5">
              <label className="block space-y-1.5">
                <span className={FIELD_LABEL}>Due on</span>
                <DateField value={dueOn} onChange={setDueOn} />
              </label>
              <DatePresetChips
                label="Due on presets"
                today={today}
                value={dueOn}
                offsets={DUE_OFFSETS}
                onPick={(day, offset) => {
                  setDueOn(day);
                  rememberDueOffset(offset);
                }}
              />
            </div>
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
