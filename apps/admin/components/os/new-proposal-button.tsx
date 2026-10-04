"use client";

import * as React from "react";
import { FilePlus2 } from "lucide-react";
import { Button } from "@repo/ui";

export const NEW_PROPOSAL_EVENT = "avx:new-proposal";

export function NewProposalButton({
  variant = "brand",
  children = "New proposal",
}: {
  variant?: React.ComponentProps<typeof Button>["variant"];
  children?: React.ReactNode;
}) {
  return (
    <Button variant={variant} onClick={() => window.dispatchEvent(new Event(NEW_PROPOSAL_EVENT))}>
      <FilePlus2 />
      {children}
    </Button>
  );
}
