"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { GROUPS, PRIMARY, canSee, type BadgeKey, type Role } from "@/lib/nav";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetBody } from "@repo/ui";
import { CountBadge } from "@/components/ui/badge";
import { Target, Building2, LayoutDashboard, Inbox, MoreHorizontal } from "lucide-react";
import { NavIcon } from "./nav-icon";

/**
 * §33 — mobile is not a shrunken desktop.
 *
 * A four-slot bottom bar carries the routes an operator actually opens on a
 * phone (triage a lead, answer a message, look up a client), with everything
 * else behind "More". The full grouped tree lives in the drawer, not the bar.
 */
const BOTTOM = [
  { href: "/", label: "Home", icon: LayoutDashboard },
  { href: "/leads", label: "Leads", icon: Target, badgeKey: "leads" as BadgeKey },
  { href: "/inbox", label: "Inbox", icon: Inbox, badgeKey: "inbox" as BadgeKey },
  { href: "/clients", label: "Clients", icon: Building2 },
];

export function MobileBottomBar({
  badges,
  onOpenMore,
}: {
  badges: Partial<Record<BadgeKey, number>>;
  onOpenMore: () => void;
}) {
  const pathname = usePathname();
  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-5 border-t border-border bg-background/95 backdrop-blur-md lg:hidden"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      aria-label="Primary"
    >
      {BOTTOM.map((entry) => {
        const active =
          entry.href === "/" ? pathname === "/" : pathname.startsWith(entry.href);
        const Icon = entry.icon;
        const count = entry.badgeKey ? badges[entry.badgeKey] : undefined;
        return (
          <Link
            key={entry.href}
            href={entry.href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "relative flex h-13 flex-col items-center justify-center gap-0.5 text-micro",
              active ? "text-foreground" : "text-subtle-foreground",
            )}
          >
            <NavIcon icon={Icon} active={active} size={22} />
            {entry.label}
            {count != null && count > 0 && (
              <span className="absolute end-[22%] top-1.5 size-1.5 rounded-full bg-danger" />
            )}
          </Link>
        );
      })}
      <button
        type="button"
        onClick={onOpenMore}
        className="flex h-13 flex-col items-center justify-center gap-0.5 text-micro text-subtle-foreground"
      >
        <MoreHorizontal size={22} strokeWidth={1.75} aria-hidden />
        More
      </button>
    </nav>
  );
}

export function MobileNavDrawer({
  open,
  onOpenChange,
  role,
  badges,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  role?: Role;
  badges: Partial<Record<BadgeKey, number>>;
}) {
  const pathname = usePathname();
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="max-h-[80dvh]">
        <SheetHeader>
          <SheetTitle>Navigate</SheetTitle>
        </SheetHeader>
        <SheetBody className="p-0">
          {[{ id: "primary", label: "", items: PRIMARY }, ...GROUPS].map((group) => {
            const items = group.items.filter((i) => canSee(i, role));
            if (items.length === 0) return null;
            return (
              <div key={group.id} className="border-b border-border last:border-b-0">
                {group.label && (
                  <p className="telemetry px-4 pb-1 pt-3 text-subtle-foreground">{group.label}</p>
                )}
                <ul>
                  {items.map((item) => {
                    const Icon = item.icon;
                    const active =
                      item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
                    const count = item.badgeKey ? badges[item.badgeKey] : undefined;
                    return (
                      <li key={item.href}>
                        <Link
                          href={item.href}
                          onClick={() => onOpenChange(false)}
                          className={cn(
                            "flex items-center gap-3 px-4 py-2.5 text-md",
                            active ? "bg-surface font-medium" : "text-muted-foreground",
                          )}
                        >
                          <NavIcon icon={Icon} active={active} size={18} />
                          <span className="truncate">{item.label}</span>
                          {item.state === "planned" ? (
                            <span className="telemetry ms-auto text-subtle-foreground">soon</span>
                          ) : (
                            count != null && <CountBadge count={count} />
                          )}
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </div>
            );
          })}
        </SheetBody>
      </SheetContent>
    </Sheet>
  );
}
