import { redirect } from "next/navigation";

import { gateRoute } from "@/lib/page-gate";

export default async function ActivityPage() {
  const denied = await gateRoute("/activity", "the audit log");
  if (denied) return denied;
  redirect("/audit");
}
