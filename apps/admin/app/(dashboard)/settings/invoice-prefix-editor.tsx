"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ArrowRight } from "lucide-react";
import { Button, Field, Input, LoadingIcon } from "@repo/ui";

import { updateInvoicePrefix } from "@/app/(dashboard)/_actions/settings";
import { INVOICE_PREFIX_PATTERN } from "@/lib/team-rules";

export function InvoicePrefixEditor({
  initialPrefix,
  next,
  canEdit,
}: {
  initialPrefix: string;
  next: string;
  canEdit: boolean;
}) {
  const router = useRouter();
  const [prefix, setPrefix] = React.useState(initialPrefix);
  const [pending, startTransition] = React.useTransition();

  const normalized = prefix.trim().toUpperCase();
  const valid = INVOICE_PREFIX_PATTERN.test(normalized);
  const unchanged = normalized === initialPrefix;
  const preview = `${normalized}-${next.slice(initialPrefix.length + 1)}`;

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
    <form onSubmit={save} className="space-y-2">
      <div className="flex flex-wrap items-end gap-2">
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
      </div>
      {valid && !unchanged && (
        <p className="flex flex-wrap items-center gap-x-2 text-meta text-muted-foreground" aria-live="polite">
          <span>Next invoice</span>
          <span className="font-mono line-through">{next}</span>
          <ArrowRight className="size-3 text-subtle-foreground" aria-hidden />
          <span className="font-mono text-foreground">{preview}</span>
        </p>
      )}
    </form>
  );
}
