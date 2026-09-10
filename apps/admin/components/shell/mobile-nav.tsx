"use client";

import { CountBadge } from "@/components/ui/badge";
import { GROUPS, PRIMARY, canSee, type BadgeKey, type Role } from "@/lib/nav";
import { cn } from "@/lib/utils";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
} from "@repo/ui/www";
import { Building2, Inbox, LayoutDashboard, MoreHorizontal, Target } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import * as React from "react";
import { NavIcon } from "./nav-icon";

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
  const router = useRouter();

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
            onMouseEnter={() => router.prefetch(entry.href)}
            onTouchStart={() => router.prefetch(entry.href)}
            className={cn(
              "relative flex h-13 flex-col items-center justify-center gap-0.5 text-micro transition-colors",
              active ? "font-medium text-foreground" : "text-subtle-foreground"
            )}
          >
            <NavIcon icon={Icon} active={active} size={22} />
            <span>{entry.label}</span>
            {count != null && count > 0 && (
              <span className="absolute end-[22%] top-1.5 size-1.5 rounded-full bg-danger" />
            )}
          </Link>
        );
      })}

      <button
        type="button"
        onClick={onOpenMore}
        className="flex h-13 flex-col items-center justify-center gap-0.5 text-micro text-subtle-foreground transition-colors hover:text-foreground"
      >
        <MoreHorizontal size={22} strokeWidth={1.75} aria-hidden />
        <span>More</span>
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
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="max-h-[85dvh] p-0">
        <DrawerHeader className="border-b border-border px-4 py-3 text-start">
          <DrawerTitle className="text-lg font-semibold text-foreground">
            Navigate
          </DrawerTitle>
          <DrawerDescription className="sr-only">
            Navigation menu
          </DrawerDescription>
        </DrawerHeader>

        <div className="overflow-y-auto pb-[calc(1rem+env(safe-area-inset-bottom))]">
          {[{ id: "primary", label: "", items: PRIMARY }, ...GROUPS].map((group) => {
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
                    const active =
                      item.href === "/"
                        ? pathname === "/"
                        : pathname.startsWith(item.href);
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
                            "flex items-center gap-3 px-4 py-3 text-md transition-colors",
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
        </div>
      </DrawerContent>
    </Drawer>
  );
}