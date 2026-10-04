"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { FileSignature } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@repo/ui";
import { ConfirmDialog } from "@/components/os/confirm-dialog";

export function GenerateContractButton({
  proposalId,
  clientName,
  variant = "brand",
  size,
}: {
  proposalId: string;
  clientName: string;
  variant?: "brand" | "outline";
  size?: "sm";
}) {
  const router = useRouter();

  async function generate() {
    try {
      const response = await fetch("/api/admin/contracts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ proposalId }),
      });
      const data = (await response.json().catch(() => ({}))) as {
        success?: boolean;
        message?: string;
        contract?: { id: string };
      };
      if (!data.success && data.contract) {
        toast.error(data.message || "The contract was created but its document failed to generate.");
        router.push(`/contracts/${data.contract.id}`);
        return { ok: true };
      }
      if (!response.ok || !data.success || !data.contract) {
        return {
          ok: false,
          message: data.message || `The contract was not generated (${response.status}).`,
        };
      }
      router.push(`/contracts/${data.contract.id}`);
      return { ok: true, message: data.message || "Contract generated. Review it, then send it." };
    } catch {
      return { ok: false, message: "The server could not be reached. Nothing was created." };
    }
  }

  return (
    <ConfirmDialog
      trigger={
        <Button type="button" variant={variant} size={size}>
          <FileSignature className="size-3.5" aria-hidden />
          Generate contract
        </Button>
      }
      title={`Generate the contract for ${clientName}?`}
      body="The contract copies this proposal's price, scope and payment split, and its document is generated now. It is not sent — you review it and send it from the contract."
      consequence="A proposal has one contract. To change the terms after this, issue a new proposal."
      confirmLabel="Generate contract"
      onConfirm={generate}
    />
  );
}
