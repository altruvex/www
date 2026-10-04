import { CalendarPlus, FilePlus2 } from "lucide-react";
import type { NextStep } from "@/components/os/next-steps";

export function convertedLeadSteps(
  clientId: string,
  allowed: { propose: boolean; schedule: boolean },
): NextStep[] {
  const steps: NextStep[] = [];
  if (allowed.propose) {
    steps.push({
      key: "propose",
      label: "New proposal",
      hint: "Quote this client",
      icon: FilePlus2,
      href: `/clients/${clientId}/new-proposal`,
      primary: true,
    });
  }
  if (allowed.schedule) {
    steps.push({
      key: "meeting",
      label: "Schedule a meeting",
      hint: "The client is filled in",
      icon: CalendarPlus,
      href: `/calendar?new=meeting&client=${encodeURIComponent(clientId)}`,
    });
  }
  return steps;
}
