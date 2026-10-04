import { redirect } from "next/navigation";
import { gateRoute } from "@/lib/page-gate";

export default async function MeetingsPage({
  searchParams,
}: {
  searchParams: Promise<{ meeting?: string; id?: string }>;
}) {
  const denied = await gateRoute("/meetings", "meetings");
  if (denied) return denied;
  const { meeting, id } = await searchParams;
  const open = meeting ?? id;
  redirect(open ? `/calendar?meeting=${encodeURIComponent(open)}` : "/calendar");
}
