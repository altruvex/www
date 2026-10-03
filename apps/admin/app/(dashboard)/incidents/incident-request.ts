"use client";

import { toast } from "sonner";

type Router = { push: (href: string) => void; refresh: () => void };

/**
 * The one client path to the incident API, shared by the list and the detail
 * page so both read its answers the same way.
 *
 * Success is only claimed when the API says something was written: a PATCH that
 * changed nothing comes back `changed: false` and is reported as exactly that,
 * never as a green toast over a no-op.
 */
export async function sendIncidentRequest(
  router: Router,
  method: "POST" | "PATCH",
  body: Record<string, unknown>,
  okMessage: string,
): Promise<boolean> {
  let res: Response;
  try {
    res = await fetch("/api/admin/incidents", {
      method,
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    });
  } catch {
    toast.error("The server could not be reached. Nothing was saved.");
    return false;
  }

  if (res.status === 401) {
    toast.error("Your session expired. Sign in again.");
    router.push("/login");
    return false;
  }

  let data: { success?: boolean; message?: string; changed?: boolean } = {};
  try {
    data = await res.json();
  } catch {
    // A proxy error page or a crashed handler answers with HTML; say what is
    // known — it failed — instead of throwing inside the click handler.
  }

  if (!res.ok || !data.success) {
    toast.error(data.message ?? "That did not save. Nothing was changed.");
    return false;
  }
  if (data.changed === false) {
    toast("Nothing changed.");
    return false;
  }

  toast.success(okMessage);
  router.refresh();
  return true;
}
