"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { UserPlus } from "lucide-react";
import { Button, LoadingIcon } from "@repo/ui";
import { convertSubmission } from "@/app/(dashboard)/_actions/clients";

export function ConvertButton({ submissionId }: { submissionId: string }) {
  const router = useRouter();
  const [busy, setBusy] = React.useState(false);

  return (
    <Button
      variant="brand"
      disabled={busy}
      onClick={async () => {
        setBusy(true);
        const result = await convertSubmission(submissionId);
        if (result.ok) {
          if (result.linked) toast.success(result.message);
          else toast.warning(result.message);
          router.push(`/clients/${result.clientId}`);
        } else {
          toast.error("Could not convert", { description: result.message });
          setBusy(false);
        }
      }}
    >
      {busy ? <LoadingIcon size="sm" /> : <UserPlus className="size-3.5" />}
      Convert to lead
    </Button>
  );
}
