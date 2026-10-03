"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button, Field, Input, LoadingIcon } from "@repo/ui";

import { updateInvoicePrefix } from "@/app/(dashboard)/_actions/settings";
import { INVOICE_PREFIX_PATTERN } from "@/lib/team-rules";

/**
 * The one editable part of invoice numbering. The counter next to it is
 * read-only on purpose: it moves only when a payment is invoiced, so two
 * invoices can never share a number because someone typed one in.
 */
export function InvoicePrefixEditor({
  initialPrefix,
  canEdit,
}: {
  initialPrefix: string;
  canEdit: boolean;
}) {
  const router = useRouter();
  const [prefix, setPrefix] = React.useState(initialPrefix);
  const [pending, startTransition] = React.useTransition();

  const normalized = prefix.trim().toUpperCase();
  const valid = INVOICE_PREFIX_PATTERN.test(normalized);
  const unchanged = normalized === initialPrefix;

  function save(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!valid || unchanged) return;
    startTransition(async () => {
      const result = await updateInvoicePrefix(normalized);
      if (result.ok) {
        toast.success(result.message ?? "Invoice prefix saved.");
        router.refresh();
      } else {
        toast.error(result.message);
      }
    });
  }

  return (
    <form onSubmit={save} className="flex flex-wrap items-end gap-2">
      <Field
        label="Prefix"
        error={prefix && !valid ? "Letters, digits and hyphens only, up to 8." : undefined}
        className="w-40"
      >
        <Input
          value={prefix}
          onChange={(e) => setPrefix(e.target.value.toUpperCase())}
          maxLength={8}
          disabled={!canEdit || pending}
          className="h-8 font-mono"
          autoComplete="off"
          spellCheck={false}
        />
      </Field>
      <Button
        type="submit"
        variant="secondary"
        size="sm"
        disabled={!canEdit || pending || !valid || unchanged}
      >
        {pending && <LoadingIcon size="sm" />}
        Save prefix
      </Button>
    </form>
  );
}
