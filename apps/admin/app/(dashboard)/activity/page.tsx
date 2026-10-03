import { redirect } from "next/navigation";

/**
 * The derived activity feed is gone: it inferred "something happened" from
 * `updatedAt` columns and could never say who or from what. The persisted
 * audit log answers both, so the old address lands there.
 */
export default function ActivityPage() {
  redirect("/audit");
}
