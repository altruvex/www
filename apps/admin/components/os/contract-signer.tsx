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
  const [values, setValues] = React.useState<SignerValues>(initial);
  const [saved, setSaved] = React.useState<SignerValues>(initial);
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const dirty =
    values.signerName.trim() !== saved.signerName.trim() ||
    values.signerPhone.trim() !== saved.signerPhone.trim() ||
    values.signerEmail.trim() !== saved.signerEmail.trim();

  const set = (key: keyof SignerValues) => (event: React.ChangeEvent<HTMLInputElement>) => {
    setValues((current) => ({ ...current, [key]: event.target.value }));
    setError(null);
  };

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!dirty) return;
    setBusy(true);
    setError(null);
    const next = {
      signerName: values.signerName.trim(),
      signerPhone: values.signerPhone.trim(),
      signerEmail: values.signerEmail.trim(),
    };
    try {
      const response = await fetch(`/api/admin/contracts/${contractId}/signer`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(next),
      });
      const data = (await response.json().catch(() => ({}))) as {
        success?: boolean;
        message?: string;
      };
      if (!response.ok || !data.success) {
        setError(data.message || `The signer was not saved (${response.status}).`);
        return;
      }
      setSaved(next);
      setValues(next);
      toast.success(data.message || "Authorised signer saved", {
        description: "Any code already sent is no longer valid.",
      });
      router.refresh();
    } catch {
      setError("The server could not be reached. Nothing was saved.");
    } finally {
      setBusy(false);
    }
  }

  const uses = (value: string | null) =>
    value ? `Blank uses the client record: ${value}` : "Blank — nothing on the client record either";

  return (
    <form onSubmit={onSubmit} className="space-y-3">
      <Field label="Name" hint={uses(fallback.name)}>
        <Input
          name="signerName"
          value={values.signerName}
          onChange={set("signerName")}
          autoComplete="off"
          disabled={busy}
        />
      </Field>
      <Field label="WhatsApp number" hint={uses(fallback.phone)}>
        <Input
          name="signerPhone"
          value={values.signerPhone}
          onChange={set("signerPhone")}
          inputMode="tel"
          autoComplete="off"
          disabled={busy}
        />
      </Field>
      <Field label="Email" hint={uses(fallback.email)}>
        <Input
          name="signerEmail"
          type="email"
          value={values.signerEmail}
          onChange={set("signerEmail")}
          autoComplete="off"
          disabled={busy}
        />
      </Field>
      {error && (
        <p className="text-meta text-danger" role="alert">
          {error}
        </p>
      )}
      <div className="flex flex-wrap items-center gap-2 border-t border-border-subtle pt-3">
        <Button type="submit" variant="outline" disabled={busy || !dirty} aria-busy={busy}>
          {busy && <LoadingIcon size="sm" />}
          Save signer
        </Button>
        {dirty && !busy && (
          <Button type="button" variant="ghost" onClick={() => setValues(saved)}>
            Undo changes
          </Button>
        )}
        <span className="text-meta text-subtle-foreground">
          Saving voids any code already sent.
        </span>
      </div>
    </form>
  );
}
