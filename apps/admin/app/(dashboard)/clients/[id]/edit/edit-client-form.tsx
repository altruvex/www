"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { Button } from "@repo/ui";
import { LoadingIcon } from "@repo/ui";
import { Field, Input } from "@repo/ui";
import { ErrorState } from "@/components/os/error-state";

export function EditClientForm({
  clientId,
  initial,
}: {
  clientId: string;
  initial: {
    name: string;
    phone: string;
    email: string;
    company: string;
    industry: string;
  };
}) {
  const router = useRouter();
  const [busy, setBusy] = React.useState(false);
  const [failure, setFailure] = React.useState<string | null>(null);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setBusy(true);
    setFailure(null);

    try {
      const response = await fetch(`/api/admin/clients/${clientId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: String(form.get("name") ?? "").trim(),
          phone: String(form.get("phone") ?? "").trim(),
          email: String(form.get("email") ?? "").trim(),
          company: String(form.get("company") ?? "").trim(),
          industry: String(form.get("industry") ?? "").trim(),
        }),
      });
      const data = (await response.json()) as { success?: boolean; message?: string };
      if (!response.ok || !data.success) {
        throw new Error(data.message || `Request failed (${response.status})`);
      }
      toast.success("Client updated");
      router.push(`/clients/${clientId}`);
      router.refresh();
    } catch (error) {
      setFailure(error instanceof Error ? error.message : "Unknown error");
      setBusy(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-3">
      <Field label="Contact name" hint="The person, not the company">
        <Input name="name" defaultValue={initial.name} placeholder="Not set" autoComplete="off" />
      </Field>
      <Field label="Phone" hint="WhatsApp reaches this number. Include the country code.">
        <Input name="phone" required defaultValue={initial.phone} inputMode="tel" />
      </Field>
      <Field label="Company">
        <Input name="company" defaultValue={initial.company} placeholder="Not set" autoComplete="off" />
      </Field>
      <Field label="Email" hint="Optional — WhatsApp is the primary channel">
        <Input
          name="email"
          type="email"
          defaultValue={initial.email}
          placeholder="Not set"
          autoComplete="off"
        />
      </Field>
      <Field label="Industry" hint="Used to suggest the proposal's accent world.">
        <Input name="industry" defaultValue={initial.industry} placeholder="Not set" autoComplete="off" />
      </Field>

      {failure && (
        <ErrorState
          what="The client was not updated"
          impact="Nothing was saved. Your changes are still in the form — fix the issue and submit again."
          detail={failure}
        />
      )}

      <div className="flex items-center gap-2 border-t border-border pt-3">
        <Button type="submit" variant="brand" disabled={busy}>
          {busy && <LoadingIcon size="sm" />}
          Save changes
        </Button>
        <Button type="button" variant="ghost" onClick={() => router.back()} disabled={busy}>
          Cancel
        </Button>
      </div>
    </form>
  );
}
