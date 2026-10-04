"use client";

import { CountBadge } from "@/components/ui/badge";
import {
  ALL_NAV_ITEMS,
  GROUPS,
  NOTIFICATIONS_ITEM,
  PRIMARY,
  SECONDARY,
  canSee,
  groupFor,
  type BadgeKey,
  type NavItem,
  type Role,
} from "@/lib/nav";
import { cn } from "@/lib/utils";
import {
  Sheet,
  SheetBody,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@repo/ui";
import { Cpu, Menu, type LucideIcon } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import * as React from "react";
import { NavIcon } from "./nav-icon";

interface Slot {
  chain: string[];
  label?: string;
  group?: string;
  badge?: { key: BadgeKey; href: string };
  icon?: LucideIcon;
}

const SLOTS: Slot[] = [
  { chain: ["/"], badge: { key: "actions", href: "/actions" } },
  { chain: ["/inbox", "/calendar", "/payments", "/notifications"] },
  {
    chain: ["/clients", "/leads", "/projects", "/tasks"],
    group: "clients",
    badge: { key: "leads", href: "/leads" },
  },
  {
    chain: ["/products", "/deployments", "/incidents", "/projects", "/tasks", "/renewals", "/analytics"],
    label: "Products",
    group: "engineering",
    badge: { key: "incidents", href: "/incidents" },
    icon: Cpu,
  },
];

function findItem(href: string): NavItem | undefined {
  return ALL_NAV_ITEMS.find((item) => item.href === href);
}

function visible(href: string, role: Role | undefined) {
  const item = findItem(href);
  return item ? canSee(item, role) : false;
}

function resolveSlots(role: Role | undefined) {
  const used = new Set<string>();
  const tabs: {
    href: string;
    label: string;
    icon: LucideIcon;
    group?: string;
    badgeKey?: BadgeKey;
  }[] = [];
  for (const slot of SLOTS) {
    const href = slot.chain.find((h) => !used.has(h) && visible(h, role));
    if (!href) continue;
    used.add(href);
    const item = findItem(href)!;
    const first = href === slot.chain[0];
    const itemGroup = GROUPS.find((g) => g.items.some((i) => i.href === href))?.id;
    tabs.push({
      href,
      label: first && slot.label ? slot.label : item.label,
      icon: first && slot.icon ? slot.icon : item.icon,
      group: first ? slot.group : itemGroup,
      badgeKey:
        first && slot.badge && visible(slot.badge.href, role) ? slot.badge.key : item.badgeKey,
    });
  }
  return tabs;
}

function isOn(pathname: string, href: string) {
  return href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(`${href}/`);
}

export function MobileBottomBar({
  role,
  badges,
  onOpenMore,
}: {
  role?: Role;
  badges: Partial<Record<BadgeKey, number>>;
  onOpenMore: () => void;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const tabs = React.useMemo(() => resolveSlots(role), [role]);
  const currentGroup = groupFor(pathname)?.id;
  const activeHref =
    tabs.find((tab) => isOn(pathname, tab.href))?.href ??
    tabs.find((tab) => tab.group && tab.group === currentGroup)?.href;

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-30 flex border-t border-border bg-background/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-md lg:hidden"
      aria-label="Primary"
    >
      {tabs.map((tab) => {
        const active = tab.href === activeHref;
        const count = tab.badgeKey ? badges[tab.badgeKey] : undefined;
        return (
          <Link
            key={tab.href}
            href={tab.href}
            aria-current={active ? "page" : undefined}
            aria-label={count ? `${tab.label}, ${count} waiting` : undefined}
            onTouchStart={() => router.prefetch(tab.href)}
            className={cn(
              "relative flex min-h-13 min-w-11 flex-1 flex-col items-center justify-center gap-0.5 text-micro no-underline transition-colors duration-[var(--dur-state)]",
              "outline-none focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-brand",
              active ? "font-medium text-foreground" : "text-subtle-foreground",
            )}
          >
            <span className="relative">
              <NavIcon icon={tab.icon} active={active} size={22} />
              {count != null && count > 0 && (
                <CountBadge
                  count={count}
                  tone={tab.badgeKey === "incidents" ? "danger" : "neutral"}
                  className="absolute -top-1.5 start-3.5 ms-0 ring-2 ring-background"
                />
              )}
            </span>
            <span className="max-w-full truncate px-1">{tab.label}</span>
          </Link>
        );
      })}

      <button
        type="button"
        onClick={onOpenMore}
        aria-haspopup="dialog"
        className="flex min-h-13 min-w-11 flex-1 flex-col items-center justify-center gap-0.5 text-micro text-subtle-foreground outline-none transition-colors duration-[var(--dur-state)] hover:text-foreground focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-brand"
      >
        <Menu size={22} strokeWidth={1.75} aria-hidden />
        <span>Menu</span>
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
  const router = useRouter();

  const handleClose = React.useCallback(() => {
    onOpenChange(false);
  }, [onOpenChange]);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom">
        <SheetHeader>
          <SheetTitle>Navigate</SheetTitle>
          <SheetDescription className="sr-only">Navigation menu</SheetDescription>
        </SheetHeader>

        <SheetBody className="p-0 pb-[calc(1rem+env(safe-area-inset-bottom))]">
          {[
            { id: "primary", label: "", items: PRIMARY },
            ...GROUPS,
            { id: "more", label: "More", items: [...SECONDARY, NOTIFICATIONS_ITEM] },
          ].map((group) => {
            const items = group.items.filter((i) => canSee(i, role));
            if (items.length === 0) return null;

            return (
              <div key={group.id} className="border-b border-border last:border-b-0">
                {group.label && (
                  <p className="telemetry px-4 pb-1 pt-3 text-subtle-foreground">
                    {group.label}
                  </p>
                )}
                <ul>
                  {items.map((item) => {
                    const Icon = item.icon;
                    const active = isOn(pathname, item.href);
                    const count = item.badgeKey ? badges[item.badgeKey] : undefined;

                    return (
                      <li key={item.href}>
                        <Link
                          href={item.href}
                          aria-current={active ? "page" : undefined}
                          onClick={handleClose}
                          onMouseEnter={() => router.prefetch(item.href)}
                          onTouchStart={() => router.prefetch(item.href)}
                          className={cn(
                            "flex min-h-11 items-center gap-3 px-4 py-3 text-md no-underline transition-colors duration-[var(--dur-state)]",
                            "outline-none focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-brand",
                            active
                              ? "bg-surface font-medium text-foreground"
                              : "text-muted-foreground hover:bg-surface/50"
                          )}
                        >
                          <NavIcon icon={Icon} active={active} size={18} />
                          <span className="truncate">{item.label}</span>
                          {item.state === "planned" ? (
                            <span className="telemetry ms-auto text-subtle-foreground">
                              soon
                            </span>
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