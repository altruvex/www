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
import { createShortcutsFor, gotoShortcutsFor, type Role } from "@/lib/nav";
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

const ANYWHERE: Section = {
  title: "Anywhere",
  rows: [
    { keys: ["⌘", "K"], label: "Command palette — search every record" },
    { keys: ["/"], label: "Command palette" },
    { keys: ["["], label: "Collapse or expand the sidebar" },
    { keys: ["?"], label: "This list" },
  ],
};

const IN_A_TABLE: Section = {
  title: "In a table",
  rows: [
    { keys: ["Tab"], label: "Move through sort headers, checkboxes and rows" },
    { keys: ["↵"], label: "Open the focused row (Space does the same)" },
    { keys: ["Space"], label: "Tick the focused checkbox to select its row" },
    { keys: ["Esc"], label: "Clear the selection" },
  ],
};

export function ShortcutsSheet({
  open,
  onOpenChange,
  role,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  role?: Role;
}) {
  const router = useRouter();
  const [isMac, setIsMac] = React.useState(true);

  React.useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setIsMac(navigator.platform.toUpperCase().indexOf("MAC") >= 0);
  }, []);

  const sections = React.useMemo<Section[]>(
    () => [
      ANYWHERE,
      {
        title: "Go to",
        rows: gotoShortcutsFor(role).map((s) => ({
          keys: ["G", s.key.toUpperCase()],
          label: s.label,
          href: s.href,
        })),
      },
      {
        title: "Create",
        rows: createShortcutsFor(role).map((s) => ({
          keys: ["C", s.key.toUpperCase()],
          label: s.label,
          href: s.href,
        })),
      },
      IN_A_TABLE,
    ],
    [role],
  );

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
          {sections.map((section) => (
            <div key={section.title}>
              <p className="telemetry border-b border-border px-4 pb-1.5 pt-4 text-subtle-foreground font-medium">
                {section.title}
              </p>
              <ul className="divide-y divide-border">
                {section.rows.map((row) => {
                  const keys = (
                    <span className="flex shrink-0 items-center gap-1">
                      {row.keys.map((k, idx) => {
                        const displayKey = !isMac && k === "⌘" ? "Ctrl" : k;
                        return <Kbd key={`${displayKey}-${idx}`}>{displayKey}</Kbd>;
                      })}
                    </span>
                  );
                  return (
                    <li key={row.label}>
                      {row.href ? (
                        <button
                          type="button"
                          onClick={() => handleRowClick(row.href)}
                          className="flex min-h-11 w-full items-center gap-3 px-4 py-2 text-start transition-colors duration-[var(--dur-state)] hover:bg-surface focus-visible:bg-surface outline-none focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-brand"
                        >
                          <span className="min-w-0 flex-1 text-base">{row.label}</span>
                          {keys}
                        </button>
                      ) : (
                        <div className="flex items-center gap-3 px-4 py-2">
                          <span className="min-w-0 flex-1 text-base">{row.label}</span>
                          {keys}
                        </div>
                      )}
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