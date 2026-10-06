"use client";

import * as React from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Plus } from "lucide-react";

import { Button } from "@repo/ui";

import { ServiceSheet, type ServiceScope } from "./service-sheet";

export function NewServiceButton({
  scope,
  showMoney = false,
  canCreate,
}: {
  scope: ServiceScope;
  showMoney?: boolean;
  canCreate: boolean;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [open, setOpen] = React.useState(canCreate && searchParams.get("new") === "service");
  const [linkPreset] = React.useState(() =>
    searchParams.get("new") === "service"
      ? {
          clientId: searchParams.get("client"),
          productId: searchParams.get("product"),
          projectId: searchParams.get("project"),
        }
      : undefined,
  );
  // A list filtered to one client starts the sheet on that client.
  const filterClient = searchParams.get("client");
  const preset = linkPreset ?? (filterClient ? { clientId: filterClient } : undefined);

  function close() {
    setOpen(false);
    if (searchParams.has("new")) {
      const next = new URLSearchParams(searchParams.toString());
      next.delete("new");
      next.delete("product");
      next.delete("project");
      const query = next.toString();
      router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
    }
  }

  if (!canCreate) return null;
  return (
    <>
      <Button variant="brand" onClick={() => setOpen(true)}>
        <Plus className="size-3.5" />
        Add service
      </Button>
      {open && <ServiceSheet scope={scope} showMoney={showMoney} preset={preset} onClose={close} />}
    </>
  );
}
