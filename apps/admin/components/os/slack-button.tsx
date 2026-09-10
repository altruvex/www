"use client";

import * as React from "react";
import { Send } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@repo/ui";

/**
 * Posts to Slack and reports what actually happened (§ honesty rule).
 *
 * The failure path is the point. A button that shows a green toast regardless
 * of what the webhook returned would make a broken integration look healthy,
 * and the operator would only find out when the message they were counting on
 * never arrived.
 */
export function SlackButton({
  action,
  label,
  pendingLabel,
  variant = "outline",
  size = "sm",
  disabled,
}: {
  action: "test" | "digest";
  label: string;
  pendingLabel: string;
  variant?: "outline" | "ghost";
  size?: "sm" | "default";
  disabled?: boolean;
}) {
  const [pending, setPending] = React.useState(false);

  async function run() {
    setPending(true);
    try {
      const res = await fetch("/api/admin/integrations/slack", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action }),
      });
      const data = (await res.json()) as { success: boolean; message?: string };
      if (data.success) toast.success(data.message ?? "Posted.");
      else toast.error(data.message ?? "Posting to Slack failed.");
    } catch {
      toast.error("The request could not be sent. Check your connection.");
    } finally {
      setPending(false);
    }
  }

  return (
    <Button variant={variant} size={size} disabled={pending || disabled} onClick={run}>
      <Send className="size-3.5" />
      {pending ? pendingLabel : label}
    </Button>
  );
}
