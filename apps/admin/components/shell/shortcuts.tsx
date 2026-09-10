"use client";

import {
  Kbd,
  Sheet,
  SheetBody,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@repo/ui";
import { useRouter } from "next/navigation";
import * as React from "react";

type ShortcutRow = {
  keys: string[];
  label: string;
  href?: string;
};

type Section = {
  title: string;
  rows: ShortcutRow[];
};

const SECTIONS: Section[] = [
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
      { keys: ["G", "D"], label: "Dashboard", href: "/" },
      { keys: ["G", "I"], label: "Inbox", href: "/inbox" },
      { keys: ["G", "L"], label: "Leads", href: "/leads" },
      { keys: ["G", "K"], label: "Pipeline", href: "/pipeline" },
      { keys: ["G", "C"], label: "Clients", href: "/clients" },
      { keys: ["G", "P"], label: "Proposals", href: "/proposals" },
      { keys: ["G", "N"], label: "Contracts", href: "/contracts" },
      { keys: ["G", "O"], label: "Projects", href: "/projects" },
      { keys: ["G", "M"], label: "Calendar", href: "/calendar" },
      { keys: ["G", "Y"], label: "Payments", href: "/payments" },
      { keys: ["G", "A"], label: "Analytics", href: "/analytics" },
      { keys: ["G", "S"], label: "Settings", href: "/settings" },
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
  const router = useRouter();
  const [isMac, setIsMac] = React.useState(true);

  React.useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setIsMac(navigator.platform.toUpperCase().indexOf("MAC") >= 0);
  }, []);

  React.useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (
        e.key === "?" &&
        !["INPUT", "TEXTAREA"].includes(
          (e.target as HTMLElement)?.tagName
        ) &&
        !(e.target as HTMLElement)?.isContentEditable
      ) {
        e.preventDefault();
        onOpenChange(!open);
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open, onOpenChange]);

  const handleRowClick = (href?: string) => {
    if (!href) return;
    onOpenChange(false);
    router.push(href);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent width="sm">
        <SheetHeader>
          <SheetTitle>Keyboard Shortcuts</SheetTitle>
          <SheetDescription>
            This app is built to be driven without a mouse.
          </SheetDescription>
        </SheetHeader>
        <SheetBody className="space-y-5 p-0">
          {SECTIONS.map((section) => (
            <div key={section.title}>
              <p className="telemetry border-b border-border px-4 pb-1.5 pt-4 text-subtle-foreground font-medium">
                {section.title}
              </p>
              <ul className="divide-y divide-border">
                {section.rows.map((row) => {
                  const isClickable = Boolean(row.href);
                  return (
                    <li
                      key={row.label}
                      onClick={() => handleRowClick(row.href)}
                      className={`flex items-center gap-3 px-4 py-2 transition-colors ${isClickable
                          ? "cursor-pointer hover:bg-surface"
                          : ""
                        }`}
                    >
                      <span className="min-w-0 flex-1 text-base">
                        {row.label}
                      </span>
                      <span className="flex shrink-0 items-center gap-1">
                        {row.keys.map((k, idx) => {
                          const displayKey =
                            !isMac && k === "⌘" ? "Ctrl" : k;
                          return (
                            <Kbd key={`${displayKey}-${idx}`}>
                              {displayKey}
                            </Kbd>
                          );
                        })}
                      </span>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </SheetBody>
      </SheetContent>
    </Sheet>
  );
}