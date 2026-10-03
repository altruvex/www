import { redirect } from "next/navigation";

/**
 * System health and integrations are one screen. The checks this page used to
 * render are the same `lib/system-health.ts` checks the Integrations screen
 * shows, so the route stays only for links and bookmarks that still name it.
 */
export default function HealthPage() {
  redirect("/integrations");
}
