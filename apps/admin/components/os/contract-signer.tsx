"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { Button, Field, Input, LoadingIcon } from "@repo/ui";

interface SignerValues {
  signerName: string;
  signerPhone: string;
  signerEmail: string;
}

/**
 * The person allowed to sign through the link. Blank fields use the client
 * record, and the hint under each field says which value that is — an empty
 * box never pretends to hold something.
 */
export function ContractSignerForm({
  contractId,
  initial,
  fallback,
}: {
  contractId: string;
  initial: SignerValues;
  fallback: { name: string | null; phone: string | null; email: string | null };
}) {
  const router = useRouter();
  const [busy, setBusy] = React.useState(false);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setBusy(true);
    try {
      const response = await fetch(`/api/admin/contracts/${contractId}/signer`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          signerName: String(form.get("signerName") ?? "").trim(),
          signerPhone: String(form.get("signerPhone") ?? "").trim(),
          signerEmail: String(form.get("signerEmail") ?? "").trim(),
        }),
      });
      const data = (await response.json()) as { success?: boolean; message?: string };
      if (!response.ok || !data.success) {
        throw new Error(data.message || `Request failed (${response.status})`);
      }
      toast.success("Authorised signer saved", {
        description: "Any code already sent is no longer valid.",
      });
      router.refresh();
    } catch (error) {
      toast.error("Signer not saved", {
        description: error instanceof Error ? error.message : "Unknown error",
      });
    } finally {
      setBusy(false);
    }
  }

  const uses = (value: string | null) =>
    value ? `Blank uses the client record: ${value}` : "Blank — nothing on the client record either";

  return (
    <form onSubmit={onSubmit} className="space-y-3">
      <Field label="Name" hint={uses(fallback.name)}>
        <Input name="signerName" defaultValue={initial.signerName} autoComplete="off" />
      </Field>
      <Field label="WhatsApp number" hint={uses(fallback.phone)}>
        <Input name="signerPhone" defaultValue={initial.signerPhone} inputMode="tel" autoComplete="off" />
      </Field>
      <Field label="Email" hint={uses(fallback.email)}>
        <Input name="signerEmail" type="email" defaultValue={initial.signerEmail} autoComplete="off" />
      </Field>
      <div className="border-t border-border pt-3">
        <Button type="submit" variant="outline" disabled={busy}>
          {busy && <LoadingIcon size="sm" />}
          Save signer
        </Button>
      </div>
    </form>
  );
}
