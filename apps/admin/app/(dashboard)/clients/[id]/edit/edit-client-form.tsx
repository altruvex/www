"use client";

import * as React from "react";
import Link from "next/link";
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
    website: string;
    country: string;
    address: string;
    billingEmail: string;
    taxId: string;
  };
}) {
  const router = useRouter();
  const [busy, setBusy] = React.useState(false);
  const [failure, setFailure] = React.useState<string | null>(null);
  const [existingId, setExistingId] = React.useState<string | null>(null);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setBusy(true);
    setFailure(null);
    setExistingId(null);
    const text = (name: string) => String(form.get(name) ?? "").trim();

    try {
      const response = await fetch(`/api/admin/clients/${clientId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: text("name"),
          phone: text("phone"),
          email: text("email"),
          company: text("company"),
          industry: text("industry"),
          website: text("website"),
          country: text("country"),
          address: text("address"),
          billingEmail: text("billingEmail"),
          taxId: text("taxId"),
        }),
      });
      const data = (await response.json()) as {
        success?: boolean;
        message?: string;
        existingId?: string;
      };
      if (data.existingId) setExistingId(data.existingId);
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

      <p className="telemetry border-t border-border pt-3 text-subtle-foreground">Company identity</p>
      <Field label="Website" hint="Include https://">
        <Input
          name="website"
          type="url"
          defaultValue={initial.website}
          placeholder="Not set"
          autoComplete="off"
        />
      </Field>
      <Field label="Country">
        <Input name="country" defaultValue={initial.country} placeholder="Not set" autoComplete="off" />
      </Field>
      <Field label="Address" hint="As it should appear on an invoice">
        <Input name="address" defaultValue={initial.address} placeholder="Not set" autoComplete="off" />
      </Field>
      <Field label="Billing email" hint="Where invoices go, if not the contact's own email">
        <Input
          name="billingEmail"
          type="email"
          defaultValue={initial.billingEmail}
          placeholder="Not set"
          autoComplete="off"
        />
      </Field>
      <Field label="Tax ID">
        <Input name="taxId" defaultValue={initial.taxId} placeholder="Not set" autoComplete="off" />
      </Field>

      {failure && (
        <ErrorState
          what="The client was not updated"
          impact="Nothing was saved. Your changes are still in the form — fix the issue and submit again."
          detail={failure}
        />
      )}
      {existingId && (
        <p className="text-meta">
          <Link href={`/clients/${existingId}`} className="font-medium underline underline-offset-2">
            Open the client that already has this number
          </Link>
        </p>
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
