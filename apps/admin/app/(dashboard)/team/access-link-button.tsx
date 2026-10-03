"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { KeyRound } from "lucide-react";

import { Button, LoadingIcon } from "@repo/ui";

import { sendAccessLink } from "@/app/(dashboard)/_actions/team";

/** Mails a set-password link: the invitation again, or a reset for someone with a password. */
export function AccessLinkButton({ userId, kind }: { userId: string; kind: "invite" | "reset" }) {
  const router = useRouter();
  const [pending, startTransition] = React.useTransition();

  function send() {
    startTransition(async () => {
      const result = await sendAccessLink(userId);
      if (result.ok) toast.success(result.message ?? "Sent.");
      else toast.error(result.message);
      router.refresh();
    });
  }

  return (
    <Button variant="ghost" size="sm" disabled={pending} onClick={send}>
      {pending ? <LoadingIcon size="sm" /> : <KeyRound className="size-3.5" />}
      {kind === "invite" ? "Resend invite" : "Send reset link"}
    </Button>
  );
}
