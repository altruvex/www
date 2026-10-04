"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { UserPlus } from "lucide-react";
import { Button, LoadingIcon } from "@repo/ui";
import { convertEstimate } from "@/app/(dashboard)/_actions/clients";

export function ConvertEstimateButton({
  leadId,
  size,
  variant = "outline",
}: {
  leadId: string;
  size?: "sm";
  variant?: "outline" | "brand";
}) {
  const router = useRouter();
  const [busy, setBusy] = React.useState(false);

  return (
    <Button
      size={size}
      variant={variant}
      disabled={busy}
      onClick={async (e) => {
        e.preventDefault();
        e.stopPropagation();
        setBusy(true);
        const result = await convertEstimate(leadId);
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
      {busy ? (
        <LoadingIcon size="sm" />
      ) : (
        <UserPlus className={size ? "size-3" : "size-3.5"} />
      )}
      Convert
    </Button>
  );
}
