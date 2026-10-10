"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Check, ChevronDown } from "lucide-react";
import {
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  LoadingIcon,
} from "@repo/ui";
import { ConfirmDialog } from "@/components/os/confirm-dialog";
import { LostReasonFields, useLostInput } from "@/components/os/lost-reason-fields";
import { NurtureReasonFields, useNurtureInput } from "@/components/os/nurture-reason-fields";
import { optionsOf, statusOf, WRITABLE_STATUSES } from "@/lib/status";
import {
  changeClientPriority,
  changeClientStatus,
} from "@/app/(dashboard)/_actions/clients";

const CLOSING = new Set(["LOST", "SPAM"]);

export function StatusMenu({
  clientId,
  clientLabel,
  status,
  priority,
  canEdit,
}: {
  clientId: string;
  clientLabel: string;
  status: string;
  priority: string;
  canEdit: boolean;
}) {
  const router = useRouter();
  const [busy, startTransition] = React.useTransition();
  const [closing, setClosing] = React.useState<string | null>(null);
  const lost = useLostInput();
  const [parking, setParking] = React.useState(false);
  const nurture = useNurtureInput();

  function apply(kind: "status" | "priority", value: string) {
    startTransition(async () => {
      const result =
        kind === "status"
          ? await changeClientStatus(clientId, value)
          : await changeClientPriority(clientId, value);
      if (result.ok) {
        toast.success(result.message ?? "Saved.");
        router.refresh();
      } else {
        toast.error(result.message);
      }
    });
  }

  return (
    <>
      {/* Not modal: a modal menu that opens a modal dialog leaves body pointer-events stuck at none. */}
      <DropdownMenu modal={false}>
        <DropdownMenuTrigger asChild>
          <Button
            variant="outline"
            disabled={busy || !canEdit}
            aria-label={`Status: ${statusOf("submissionStatus", status).label}. Change status or priority`}
          >
            {busy ? <LoadingIcon size="sm" /> : null}
            {statusOf("submissionStatus", status).label}
            <ChevronDown className="size-3" aria-hidden />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuLabel>Set status</DropdownMenuLabel>
          {optionsOf("submissionStatus")
            .filter((option) => WRITABLE_STATUSES.has(option.value))
            .map((option) => (
              <DropdownMenuItem
                key={option.value}
                disabled={option.value === status}
                onSelect={() =>
                  CLOSING.has(option.value)
                    ? (lost.reset(), setClosing(option.value))
                    : option.value === "NURTURE"
                      ? (nurture.reset(), setParking(true))
                      : apply("status", option.value)
                }
                destructive={CLOSING.has(option.value)}
              >
                {option.label}
                {option.value === status && (
                  <Check className="ms-auto size-3.5" aria-label="current" />
                )}
              </DropdownMenuItem>
            ))}
          <DropdownMenuSeparator />
          <DropdownMenuLabel>Set priority</DropdownMenuLabel>
          {optionsOf("priority").map((option) => (
            <DropdownMenuItem
              key={option.value}
              disabled={option.value === priority}
              onSelect={() => apply("priority", option.value)}
            >
              {option.label}
              {option.value === priority && (
                <Check className="ms-auto size-3.5" aria-label="current" />
              )}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>

      <ConfirmDialog
        open={closing !== null}
        onOpenChange={(open) => !open && setClosing(null)}
        tone="danger"
        title={
          closing === "SPAM"
            ? `Mark ${clientLabel} as spam?`
            : `Mark ${clientLabel} as lost?`
        }
        consequence={
          closing === "SPAM"
            ? "It leaves the leads list and the pipeline. Its records, notes and history stay."
            : "It leaves the open pipeline. Its proposals, notes and history stay, and the status can be set back."
        }
        confirmLabel={closing === "SPAM" ? "Mark spam" : "Mark lost"}
        confirmDisabled={closing === "LOST" && !lost.ready}
        onConfirm={async () => {
          if (!closing) return;
          const result = await changeClientStatus(
            clientId,
            closing,
            closing === "LOST" ? lost.value : undefined,
          );
          if (result.ok) router.refresh();
          return result;
        }}
      >
        {closing === "LOST" && (
          <LostReasonFields value={lost.value} onChange={lost.setValue} />
        )}
      </ConfirmDialog>

      <ConfirmDialog
        open={parking}
        onOpenChange={setParking}
        title={`Move ${clientLabel} to nurture?`}
        consequence="It is parked until the review date, when it comes back as a follow-up. The status can be set back at any time."
        confirmLabel="Move to nurture"
        confirmDisabled={!nurture.ready}
        onConfirm={async () => {
          const result = await changeClientStatus(clientId, "NURTURE", undefined, nurture.value);
          if (result.ok) router.refresh();
          return result;
        }}
      >
        <NurtureReasonFields value={nurture.value} onChange={nurture.setValue} />
      </ConfirmDialog>
    </>
  );
}

export function LifecycleButton({
  label,
  busyLabel,
  endpoint,
  body,
  variant = "outline",
  confirm,
  successMessage,
}: {
  label: string;
  busyLabel: string;
  endpoint: string;
  body?: Record<string, unknown>;
  variant?: "outline" | "brand" | "default";
  confirm?: string;
  successMessage?: string;
}) {
  const router = useRouter();
  const [busy, setBusy] = React.useState(false);

  async function post(): Promise<{ ok: boolean; message?: string }> {
    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: body ? { "Content-Type": "application/json" } : undefined,
        body: body ? JSON.stringify(body) : undefined,
      });
      const data = (await response.json().catch(() => ({}))) as {
        success?: boolean;
        message?: string;
      };
      if (!response.ok || !data.success) {
        return {
          ok: false,
          message:
            data.message ||
            `The server refused (${response.status}). Nothing was changed.`,
        };
      }
      router.refresh();
      return {
        ok: true,
        message: data.message || successMessage || `${label}: done.`,
      };
    } catch {
      return {
        ok: false,
        message:
          "The request failed before the server answered. Nothing was changed — you can retry.",
      };
    }
  }

  async function run() {
    setBusy(true);
    const result = await post();
    setBusy(false);
    if (result.ok) toast.success(result.message);
    else toast.error(`${label} failed`, { description: result.message });
  }

  if (confirm) {
    return (
      <ConfirmDialog
        trigger={<Button variant={variant}>{label}</Button>}
        title={`${label}?`}
        consequence={confirm}
        confirmLabel={label}
        onConfirm={post}
      />
    );
  }

  return (
    <Button variant={variant} onClick={run} disabled={busy}>
      {busy && <LoadingIcon size="sm" />}
      {busy ? busyLabel : label}
    </Button>
  );
}
