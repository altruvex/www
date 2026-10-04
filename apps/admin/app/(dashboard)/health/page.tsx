import { redirect } from "next/navigation";

import { gateRoute } from "@/lib/page-gate";

export default async function HealthPage() {
  const denied = await gateRoute("/health", "system health");
  if (denied) return denied;
  redirect("/integrations");
}
