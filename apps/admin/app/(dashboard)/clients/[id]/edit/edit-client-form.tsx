"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { Button } from "@repo/ui";
import { LoadingIcon } from "@repo/ui";
import { Field, Input } from "@repo/ui";
import { IndustrySelect } from "@/components/os/industry-select";
import { UrlInput } from "@/components/os/url-input";
import { CountrySelect } from "@/components/os/country-select";
import { PhoneInput } from "@/components/os/phone-input";
import { ErrorState } from "@/components/os/error-state";
import { taxIdHint } from "@/lib/tax-id";

export function EditClientForm({
  clientId,
  initial,
  onDone,
}: {
  clientId: string;
  onDone?: () => void;
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
  const [country, setCountry] = React.useState(initial.country);
  const [taxId, setTaxId] = React.useState(initial.taxId);
  const taxCheck = taxIdHint(country, taxId);

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
      toast.success(data.message || "Client details saved.");
      setBusy(false);
      if (onDone) onDone();
      else router.push(`/clients/${clientId}`);
      router.refresh();
    } catch (error) {
      setFailure(error instanceof Error ? error.message : "Unknown error");
      setBusy(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-3">
      <Field label="Contact name" hint="The person, not the company">
        <Input
          name="name"
          defaultValue={initial.name}
          placeholder="Not set"
          autoComplete="off"
        />
      </Field>
      <Field
        label="Phone"
        hint="WhatsApp reaches this number. Pick the country code, or paste the full +… number."
      >
        <PhoneInput name="phone" required defaultValue={initial.phone} />
      </Field>
      <Field label="Company">
        <Input
          name="company"
          defaultValue={initial.company}
          placeholder="Not set"
          autoComplete="off"
        />
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
      <Field
        label="Industry"
        hint="Pick what the client does. It only sets the starting colour of their proposals; you can change it per proposal."
      >
        <IndustrySelect name="industry" defaultValue={initial.industry} />
      </Field>

      <p className="telemetry border-t border-border-subtle pt-3 text-subtle-foreground">
        Company identity
      </p>
      <Field label="Website" hint="Include https://">
        <UrlInput
          name="website"
          type="url"
          defaultValue={initial.website}
          placeholder="Not set"
          autoComplete="off"
        />
      </Field>
      <Field label="Country">
        <CountrySelect
          name="country"
          defaultValue={initial.country}
          onChange={setCountry}
        />
      </Field>
      <Field label="Address" hint="As it should appear on an invoice">
        <Input
          name="address"
          defaultValue={initial.address}
          placeholder="Not set"
          autoComplete="off"
        />
      </Field>
      <Field
        label="Billing email"
        hint="Where invoices go, if not the contact's own email"
      >
        <Input
          name="billingEmail"
          type="email"
          defaultValue={initial.billingEmail}
          placeholder={initial.email || "Not set"}
          autoComplete="off"
        />
      </Field>
      <Field label="Tax ID" hint={taxCheck.hint ?? undefined}>
        <Input
          name="taxId"
          defaultValue={initial.taxId}
          onChange={(event) => setTaxId(event.target.value)}
          placeholder="Not set"
          autoComplete="off"
        />
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
          <Link
            href={`/clients/${existingId}`}
            className="font-medium underline underline-offset-2"
          >
            Open the client that already has this number
          </Link>
        </p>
      )}

      <div className="flex items-center gap-2 border-t border-border-subtle pt-3">
        <Button type="submit" variant="brand" disabled={busy}>
          {busy && <LoadingIcon size="sm" />}
          Save changes
        </Button>
        <Button
          type="button"
          variant="ghost"
          onClick={() => (onDone ? onDone() : router.back())}
          disabled={busy}
        >
          Cancel
        </Button>
      </div>
    </form>
  );
}
