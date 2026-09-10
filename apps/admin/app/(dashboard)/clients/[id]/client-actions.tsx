"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ChevronDown } from "lucide-react";
import { Button } from "@repo/ui";
import { LoadingIcon } from "@repo/ui";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@repo/ui";
import { optionsOf, statusOf } from "@/lib/status";
import { setClientPriority, setClientStatus } from "@/app/(dashboard)/_actions/records";

/**
 * The client-side island on an otherwise server-rendered detail page.
 * Everything here is a mutation; everything else on the page is server HTML.
 */
export function StatusMenu({
  clientId,
  status,
  priority,
}: {
  clientId: string;
  status: string;
  priority: string;
}) {
  const router = useRouter();
  const [busy, startTransition] = React.useTransition();

  function change(kind: "status" | "priority", value: string) {
    startTransition(async () => {
      try {
        if (kind === "status") await setClientStatus(clientId, value);
        else await setClientPriority(clientId, value);
        toast.success(`${kind === "status" ? "Status" : "Priority"} updated`);
        router.refresh();
      } catch (error) {
        toast.error("Could not update", {
          description: error instanceof Error ? error.message : "Unknown error",
        });
      }
    });
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" disabled={busy}>
          {busy ? <LoadingIcon size="sm" /> : null}
          {statusOf("submissionStatus", status).label}
          <ChevronDown className="size-3" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent>
        <DropdownMenuLabel>Set status</DropdownMenuLabel>
        {optionsOf("submissionStatus").map((option) => (
          <DropdownMenuItem
            key={option.value}
            onSelect={() => change("status", option.value)}
            destructive={option.value === "LOST" || option.value === "SPAM"}
          >
            {option.label}
          </DropdownMenuItem>
        ))}
        <DropdownMenuLabel>Set priority</DropdownMenuLabel>
        {optionsOf("priority").map((option) => (
          <DropdownMenuItem
            key={option.value}
            onSelect={() => change("priority", option.value)}
          >
            {option.label}
            {option.value === priority && <span className="ms-auto text-subtle-foreground">current</span>}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

/** Fire-and-report POST buttons for the proposal / contract lifecycle. */
export function LifecycleButton({
  label,
  busyLabel,
  endpoint,
  body,
  variant = "outline",
  confirm,
}: {
  label: string;
  busyLabel: string;
  endpoint: string;
  body?: Record<string, unknown>;
  variant?: "outline" | "brand" | "default";
  confirm?: string;
}) {
  const router = useRouter();
  const [busy, setBusy] = React.useState(false);

  async function run() {
    if (confirm && !window.confirm(confirm)) return;
    setBusy(true);
    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: body ? { "Content-Type": "application/json" } : undefined,
        body: body ? JSON.stringify(body) : undefined,
      });
      const data = (await response.json()) as { success?: boolean; message?: string };
      if (!response.ok || !data.success) {
        throw new Error(data.message || `Request failed (${response.status})`);
      }
      toast.success(label);
      router.refresh();
    } catch (error) {
      // §38: say what failed, what it means, and leave the record untouched.
      toast.error(`${label} failed`, {
        description:
          error instanceof Error
            ? `${error.message}. Nothing was changed — you can retry safely.`
            : "Unknown error. Nothing was changed.",
      });
    } finally {
      setBusy(false);
    }
  }

  return (
    <Button variant={variant} onClick={run} disabled={busy}>
      {busy && <LoadingIcon size="sm" />}
      {busy ? busyLabel : label}
    </Button>
  );
}

export function MarkSignedButton({ contractId }: { contractId: string }) {
  const router = useRouter();
  const [busy, setBusy] = React.useState(false);

  async function run() {
    const signedByName = window.prompt(
      "Who signed it? This is recorded on the contract and cannot be edited afterwards.",
    );
    if (!signedByName?.trim()) return;
    setBusy(true);
    try {
      const response = await fetch(`/api/admin/contracts/${contractId}/mark-signed`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ signedByName: signedByName.trim() }),
      });
      const data = (await response.json()) as { success?: boolean; message?: string };
      if (!response.ok || !data.success) throw new Error(data.message || "Request failed");
      toast.success("Contract marked as signed");
      router.refresh();
    } catch (error) {
      toast.error("Could not mark as signed", {
        description: error instanceof Error ? error.message : "Unknown error",
      });
    } finally {
      setBusy(false);
    }
  }

  return (
    <Button variant="outline" onClick={run} disabled={busy}>
      {busy && <LoadingIcon size="sm" />}
      Mark signed
    </Button>
  );
}
