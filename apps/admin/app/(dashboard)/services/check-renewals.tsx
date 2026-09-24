"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { BellRing } from "lucide-react";

import { Button, LoadingIcon } from "@repo/ui";

/**
 * Runs the renewal sweep now and says what it actually wrote.
 *
 * "0 new alerts" is a real answer, not a failure: every due alert may already
 * have been raised by an earlier run, and saying so is the point of reporting
 * the count instead of a generic success.
 */
export function CheckRenewalsButton() {
  const router = useRouter();
  const [busy, setBusy] = React.useState(false);

  async function run() {
    setBusy(true);
    try {
      const res = await fetch("/api/admin/services/check", { method: "POST" });
      if (res.status === 401) {
        toast.error("Your session expired. Sign in again.");
        router.push("/login");
        return;
      }
      const data = (await res.json()) as {
        success: boolean;
        message?: string;
        result?: { checked: number; alerted: number; notifications: number };
      };
      if (!data.success || !data.result) {
        toast.error(data.message ?? "The renewal check failed.");
        return;
      }
      const { checked, alerted } = data.result;
      toast.success(
        alerted > 0
          ? `Raised ${alerted} new renewal alert${alerted === 1 ? "" : "s"} — see Notifications.`
          : checked > 0
            ? `${checked} service${checked === 1 ? " is" : "s are"} inside 30 days; every alert was already raised.`
            : "Nothing expires in the next 30 days.",
      );
      router.refresh();
    } catch {
      toast.error("The request could not be sent. Check your connection.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Button variant="outline" onClick={run} disabled={busy}>
      {busy ? <LoadingIcon size="sm" /> : <BellRing className="size-3.5" />}
      Check renewals now
    </Button>
  );
}
