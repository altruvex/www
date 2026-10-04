"use client";

import * as React from "react";
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
  const [open, setOpen] = React.useState(false);
  if (!canCreate) return null;
  return (
    <>
      <Button variant="brand" onClick={() => setOpen(true)}>
        <Plus className="size-3.5" />
        Add service
      </Button>
      {open && <ServiceSheet scope={scope} showMoney={showMoney} onClose={() => setOpen(false)} />}
    </>
  );
}
