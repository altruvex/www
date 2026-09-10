"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { UserPlus } from "lucide-react";
import { Button } from "@repo/ui";
import { LoadingIcon } from "@repo/ui";
import { convertSubmissionToClient } from "@/app/(dashboard)/_actions/records";

export function ConvertButton({ submissionId }: { submissionId: string }) {
  const router = useRouter();
  const [busy, setBusy] = React.useState(false);

  return (
    <Button
      variant="brand"
      disabled={busy}
      onClick={async () => {
        setBusy(true);
        try {
          const result = await convertSubmissionToClient(submissionId);
          toast.success(result.created ? "Lead created" : "Linked to an existing client", {
            description: "This submission is unchanged and now referenced by the client record.",
          });
          router.push(`/clients/${result.clientId}`);
        } catch (error) {
          toast.error("Could not convert", {
            description: error instanceof Error ? error.message : "Unknown error",
          });
          setBusy(false);
        }
      }}
    >
      {busy ? <LoadingIcon size="sm" /> : <UserPlus className="size-3.5" />}
      Convert to lead
    </Button>
  );
}
