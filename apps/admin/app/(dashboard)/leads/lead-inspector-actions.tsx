"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button, LoadingIcon } from "@repo/ui";
import { changeClientStatus } from "@/app/(dashboard)/_actions/clients";

export function LeadInspectorActions({
  clientId,
  status,
}: {
  clientId: string;
  status: string;
}) {
  const router = useRouter();
  const [pending, setPending] = React.useState<string | null>(null);

  async function apply(next: string) {
    setPending(next);
    const result = await changeClientStatus(clientId, next);
    setPending(null);
    if (result.ok) {
      toast.success(result.message ?? "Saved.");
      router.refresh();
    } else {
      toast.error("Nothing was changed", { description: result.message });
    }
  }

  return (
    <>
      {status !== "CONTACTED" && status !== "QUALIFIED" && (
        <Button
          variant="outline"
          onClick={() => apply("CONTACTED")}
          disabled={pending !== null}
        >
          {pending === "CONTACTED" && <LoadingIcon size="sm" />}
          Mark contacted
        </Button>
      )}
      {status !== "QUALIFIED" && (
        <Button
          variant="brand"
          onClick={() => apply("QUALIFIED")}
          disabled={pending !== null}
        >
          {pending === "QUALIFIED" && <LoadingIcon size="sm" />}
          Qualify
        </Button>
      )}
    </>
  );
}
