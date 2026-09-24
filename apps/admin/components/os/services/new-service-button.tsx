"use client";

import * as React from "react";
import { Plus } from "lucide-react";

import { Button } from "@repo/ui";

import { ServiceSheet, type ServiceScope } from "./service-sheet";

/** Page-header entry point for adding a service outside a list panel. */
export function NewServiceButton({ scope }: { scope: ServiceScope }) {
  const [open, setOpen] = React.useState(false);
  return (
    <>
      <Button variant="brand" onClick={() => setOpen(true)}>
        <Plus className="size-3.5" />
        Add service
      </Button>
      {/* Remounted per opening so the form starts clean. */}
      {open && <ServiceSheet scope={scope} onClose={() => setOpen(false)} />}
    </>
  );
}
