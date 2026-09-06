import { notFound } from "next/navigation";

import { loadPortal } from "@/lib/client-portal";
import { PortalClient } from "./portal-client";

export const dynamic = "force-dynamic";

/**
 * The client-facing maintenance portal.
 *
 * Rendered on the server so a client sees their plan and allowance without a
 * loading state, and so the token never has to be handed to client-side code
 * for the initial read.
 */
export default async function ClientPortalPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const portal = await loadPortal(token);

  if (!portal) notFound();

  return <PortalClient token={token} initial={portal} />;
}
