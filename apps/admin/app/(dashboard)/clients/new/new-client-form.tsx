"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/input";
import { ErrorState } from "@/components/os/error-state";

export function NewClientForm() {
  const router = useRouter();
  const [busy, setBusy] = React.useState(false);
  const [failure, setFailure] = React.useState<string | null>(null);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setBusy(true);
    setFailure(null);

    try {
      const response = await fetch("/api/admin/clients", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: String(form.get("name") ?? "").trim(),
          phone: String(form.get("phone") ?? "").trim(),
          email: String(form.get("email") ?? "").trim(),
          company: String(form.get("company") ?? "").trim(),
          industry: String(form.get("industry") ?? "").trim(),
        }),
      });
      const data = (await response.json()) as {
        success?: boolean;
        message?: string;
        client?: { id: string };
      };
      if (!response.ok || !data.success || !data.client) {
        throw new Error(data.message || `Request failed (${response.status})`);
      }
      toast.success("Client created");
      router.push(`/clients/${data.client.id}`);
    } catch (error) {
      setFailure(error instanceof Error ? error.message : "Unknown error");
      setBusy(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-3">
      <Field label="Contact name" hint="The person, not the company">
        <Input name="name" required placeholder="Layla Hassan" autoComplete="off" />
      </Field>
      <Field
        label="Phone"
        hint="WhatsApp reaches this number. Include the country code."
      >
        <Input name="phone" required placeholder="+20 100 000 0000" inputMode="tel" />
      </Field>
      <Field label="Company">
        <Input name="company" placeholder="Nile Logistics" autoComplete="off" />
      </Field>
      <Field label="Email" hint="Optional — WhatsApp is the primary channel">
        <Input name="email" type="email" placeholder="layla@nilelogistics.com" autoComplete="off" />
      </Field>
      <Field
        label="Industry"
        hint="Used to suggest the proposal's accent world. Editable later."
      >
        <Input name="industry" placeholder="Logistics" autoComplete="off" />
      </Field>

      {failure && (
        <ErrorState
          what="The client was not created"
          impact="Nothing was saved. No duplicate record exists, so it is safe to submit again."
          detail={failure}
        />
      )}

      <div className="flex items-center gap-2 border-t border-border pt-3">
        <Button type="submit" variant="brand" disabled={busy}>
          {busy && <Loader2 className="size-3.5 animate-spin" />}
          Create client
        </Button>
        <Button type="button" variant="ghost" onClick={() => router.back()} disabled={busy}>
          Cancel
        </Button>
      </div>
    </form>
  );
}
