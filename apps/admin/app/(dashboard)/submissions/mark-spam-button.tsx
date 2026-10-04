"use client";

import { useRouter } from "next/navigation";
import { Ban } from "lucide-react";
import { Button } from "@repo/ui";
import { ConfirmDialog } from "@/components/os/confirm-dialog";
import { updateSubmissionTriage } from "./actions";

export function MarkSpamButton({
  submissionId,
  name,
}: {
  submissionId: string;
  name: string;
}) {
  const router = useRouter();
  return (
    <ConfirmDialog
      trigger={
        <Button variant="destructive-ghost">
          <Ban className="size-3.5" aria-hidden />
          Mark spam
        </Button>
      }
      tone="danger"
      title={`Mark ${name} as spam?`}
      consequence="It leaves the unconverted count and its Convert button is hidden. The submission itself is kept, and the triage on its page can change it back."
      confirmLabel="Mark spam"
      onConfirm={async () => {
        const result = await updateSubmissionTriage({
          id: submissionId,
          status: "SPAM",
        });
        if (result.ok) router.refresh();
        return result;
      }}
    />
  );
}
