"use client";

import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetBody, SheetDescription } from "@repo/ui";
import { Kbd } from "@repo/ui";

const SECTIONS: { title: string; rows: { keys: string[]; label: string }[] }[] = [
  {
    title: "Anywhere",
    rows: [
      { keys: ["⌘", "K"], label: "Command palette — search every record" },
      { keys: ["/"], label: "Command palette" },
      { keys: ["["], label: "Collapse or expand the sidebar" },
      { keys: ["?"], label: "This list" },
    ],
  },
  {
    title: "Go to",
    rows: [
      { keys: ["G", "D"], label: "Dashboard" },
      { keys: ["G", "I"], label: "Inbox" },
      { keys: ["G", "L"], label: "Leads" },
      { keys: ["G", "K"], label: "Pipeline" },
      { keys: ["G", "C"], label: "Clients" },
      { keys: ["G", "P"], label: "Proposals" },
      { keys: ["G", "N"], label: "Contracts" },
      { keys: ["G", "O"], label: "Projects" },
      { keys: ["G", "M"], label: "Calendar" },
      { keys: ["G", "Y"], label: "Payments" },
      { keys: ["G", "A"], label: "Analytics" },
      { keys: ["G", "S"], label: "Settings" },
    ],
  },
  {
    title: "In a table",
    rows: [
      { keys: ["Tab"], label: "Move through headers and rows" },
      { keys: ["Space"], label: "Select the focused row" },
      { keys: ["↵"], label: "Open the focused record" },
    ],
  },
];

export function ShortcutsSheet({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent width="sm">
        <SheetHeader>
          <SheetTitle>Keyboard</SheetTitle>
          <SheetDescription>
            This app is built to be driven without a mouse.
          </SheetDescription>
        </SheetHeader>
        <SheetBody className="space-y-5 p-0">
          {SECTIONS.map((section) => (
            <div key={section.title}>
              <p className="telemetry border-b border-border px-4 pb-1.5 pt-4 text-subtle-foreground">
                {section.title}
              </p>
              <ul className="divide-y divide-border">
                {section.rows.map((row) => (
                  <li key={row.label} className="flex items-center gap-3 px-4 py-2">
                    <span className="min-w-0 flex-1 text-base">{row.label}</span>
                    <span className="flex shrink-0 items-center gap-1">
                      {row.keys.map((k) => (
                        <Kbd key={k}>{k}</Kbd>
                      ))}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </SheetBody>
      </SheetContent>
    </Sheet>
  );
}
