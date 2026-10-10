"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button, Field, Input, LoadingIcon } from "@repo/ui";

import { resetAllData } from "@/app/(dashboard)/_actions/full-reset";

export function FullReset({ phrase }: { phrase: string }) {
  const router = useRouter();
  const [typed, setTyped] = React.useState("");
  const [pending, startTransition] = React.useTransition();
  const matches = typed.trim() === phrase;

  function run(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!matches) return;
    startTransition(async () => {
      const result = await resetAllData(typed);
      if (result.ok) {
        toast.success(result.message ?? "Reset complete.");
        setTyped("");
        router.refresh();
      } else {
        toast.error(result.message);
      }
    });
  }

  return (
    <form onSubmit={run} className="space-y-3">
      <Field label={`Type ${phrase} to confirm`}>
        <Input
          value={typed}
          onChange={(e) => setTyped(e.target.value)}
          disabled={pending}
          className="h-8 font-mono"
          autoComplete="off"
          spellCheck={false}
        />
      </Field>
      <Button type="submit" variant="destructive" size="sm" disabled={!matches || pending}>
        {pending && <LoadingIcon size="sm" />}
        Empty the database
      </Button>
    </form>
  );
}
