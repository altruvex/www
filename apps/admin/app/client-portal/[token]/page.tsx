import type { Metadata } from "next";

import { loadPortal, loadPortalContact } from "@/lib/client-portal";
import { PortalInvalid } from "@/app/portal/[token]/portal-shell";

import { PortalClient } from "./portal-client";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Maintenance portal",
  robots: { index: false, follow: false },
};

export default async function ClientPortalPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const [portal, contact] = await Promise.all([loadPortal(token), loadPortalContact()]);

  if (!portal) return <PortalInvalid kind="maintenance" contact={contact} />;

  return <PortalClient token={token} initial={portal} contact={contact} />;
}
