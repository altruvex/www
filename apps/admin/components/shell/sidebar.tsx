"use client";

import { CountBadge } from "@/components/ui/badge";
import {
  GROUPS,
  PRIMARY,
  canSee,
  type BadgeKey,
  type NavItem,
  type Role,
} from "@/lib/nav";
import { cn } from "@/lib/utils";
import { Hint } from "@repo/ui";
import { ChevronDown, PanelLeftClose, PanelLeftOpen } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import * as React from "react";
import { NavIcon } from "./nav-icon";

export function Sidebar({
  role,
  badges,
  collapsed,
  onToggleCollapse,
  onNavigate,
}: {
  role?: Role;
  badges: Partial<Record<BadgeKey, number>>;
  collapsed: boolean;
  onToggleCollapse: () => void;
  onNavigate?: () => void;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [closed, setClosed] = React.useState<Record<string, boolean>>({});
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMounted(true);
    try {
      const raw = window.localStorage.getItem("avx.nav.closed");
      if (raw) setClosed(JSON.parse(raw) as Record<string, boolean>);
    } catch { }
  }, []);

  function toggleGroup(id: string) {
    setClosed((prev) => {
      const next = { ...prev, [id]: !prev[id] };
      try {
        window.localStorage.setItem("avx.nav.closed", JSON.stringify(next));
      } catch { }
      return next;
    });
  }

  const isActive = React.useCallback(
    (item: NavItem) =>
      item.href === "/"
        ? pathname === "/"
        : pathname === item.href || pathname.startsWith(`${item.href}/`),
    [pathname]
  );

  return (
    <div
      className="liquid-glass-toolbar flex h-full flex-col bg-sidebar transition-[width] duration-[var(--dur-state)] ease-in-out"
      style={{ width: collapsed ? "var(--sidebar-w-collapsed)" : "var(--sidebar-w)" }}
    >
      <div
        className="flex shrink-0 items-center gap-2 border-b border-sidebar-border px-3"
        style={{ height: "var(--topbar-h)" }}
      >
        <Link
          href="/"
          onClick={onNavigate}
          onMouseEnter={() => router.prefetch("/")}
          className="flex min-w-0 items-center gap-2 rounded-sm outline-none focus-visible:ring-2 focus-visible:ring-foreground"
          aria-label="Altruvex Admin, go to dashboard"
        >
          <span className="grid size-5 shrink-0 place-items-center rounded-sm bg-foreground font-sans text-micro font-semibold text-background">
            A
          </span>
          {!collapsed && (
            <span className="truncate font-sans text-md font-semibold tracking-tight">
              Altruvex
            </span>
          )}
        </Link>
        {!collapsed && (
          <span className="telemetry ms-auto text-subtle-foreground">OS</span>
        )}
      </div>

      <nav className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden px-2 py-2">
        <ul className="space-y-0.5">
          {PRIMARY.filter((i) => canSee(i, role)).map((item) => (
            <SidebarLink
              key={item.href}
              item={item}
              active={isActive(item)}
              collapsed={collapsed}
              badge={item.badgeKey ? badges[item.badgeKey] : undefined}
              onNavigate={onNavigate}
            />
          ))}
        </ul>

        {mounted &&
          GROUPS.map((group) => {
            const items = group.items.filter((i) => canSee(i, role));
            if (items.length === 0) return null;
            const groupActive = items.some(isActive);
            const isOpen = groupActive || !closed[group.id];

            if (collapsed) {
              return (
                <ul key={group.id} className="mt-2 space-y-0.5 border-t border-sidebar-border pt-2">
                  {items.map((item) => (
                    <SidebarLink
                      key={item.href}
                      item={item}
                      active={isActive(item)}
                      collapsed
                      badge={item.badgeKey ? badges[item.badgeKey] : undefined}
                      onNavigate={onNavigate}
                    />
                  ))}
                </ul>
              );
            }

            return (
              <div key={group.id} className="mt-3">
                <button
                  type="button"
                  onClick={() => toggleGroup(group.id)}
                  aria-expanded={isOpen}
                  aria-controls={`group-${group.id}`}
                  className={cn(
                    "telemetry flex w-full items-center gap-1 rounded-sm px-2 py-1 text-subtle-foreground outline-none",
                    "transition-colors duration-(--dur-state) hover:text-foreground focus-visible:ring-2 focus-visible:ring-sidebar-border"
                  )}
                >
                  {group.label}
                  <ChevronDown
                    className={cn(
                      "ms-auto size-3 transition-transform duration-(--dur-state)",
                      !isOpen && "-rotate-90"
                    )}
                    aria-hidden
                  />
                </button>
                <div
                  className={cn(
                    "grid transition-all duration-(--dur-state) ease-in-out",
                    isOpen ? "mt-0.5 grid-rows-[1fr] opacity-100" : "mt-0 grid-rows-[0fr] opacity-0"
                  )}
                >
                  <ul id={`group-${group.id}`} className="overflow-hidden space-y-0.5">
                    {items.map((item) => (
                      <SidebarLink
                        key={item.href}
                        item={item}
                        active={isActive(item)}
                        collapsed={false}
                        badge={item.badgeKey ? badges[item.badgeKey] : undefined}
                        onNavigate={onNavigate}
                      />
                    ))}
                  </ul>
                </div>
              </div>
            );
          })}
      </nav>

      <div className="shrink-0 border-t border-sidebar-border p-2">
        <button
          type="button"
          onClick={onToggleCollapse}
          className={cn(
            "flex h-(--control-h-sm) w-full items-center gap-2 rounded-md px-2 text-meta text-muted-foreground outline-none",
            "transition-colors duration-(--dur-state) hover:bg-sidebar-accent hover:text-foreground focus-visible:ring-2 focus-visible:ring-sidebar-border"
          )}
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {collapsed ? (
            <PanelLeftOpen size={16} strokeWidth={1.75} />
          ) : (
            <>
              <PanelLeftClose size={16} strokeWidth={1.75} />
              Collapse
            </>
          )}
        </button>
      </div>
    </div>
  );
}

function SidebarLink({
  item,
  active,
  collapsed,
  badge,
  onNavigate,
}: {
  item: NavItem;
  active: boolean;
  collapsed: boolean;
  badge?: number;
  onNavigate?: () => void;
}) {
  const router = useRouter();
  const Icon = item.icon;
  const planned = item.state === "planned";

  const contentClasses = cn(
    "group relative flex h-7 items-center gap-2 rounded-md px-2 text-base outline-none",
    "transition-colors duration-[var(--dur-state)]",
    active
      ? "bg-sidebar-accent font-medium text-sidebar-accent-foreground"
      : "text-muted-foreground",
    !planned && "hover:bg-sidebar-accent/60 hover:text-foreground focus-visible:ring-2 focus-visible:ring-sidebar-border",
    planned && "cursor-not-allowed opacity-70",
    collapsed && "justify-center px-0"
  );

  const innerContent = (
    <>
      {active && (
        <span
          className="absolute -inset-s-2 top-1/2 h-4 w-0.5 -translate-y-1/2 rounded-e-full bg-foreground"
          aria-hidden
        />
      )}
      <NavIcon
        icon={Icon}
        active={active}
        size={collapsed ? 18 : 16}
        className={planned ? "opacity-50" : undefined}
      />
      {!collapsed && (
        <>
          <span className={cn("truncate", planned && "text-subtle-foreground")}>
            {item.label}
          </span>
          {planned && (
            <span className="telemetry ms-auto text-subtle-foreground">soon</span>
          )}
          {!planned && badge != null && badge > 0 && (
            <CountBadge count={badge} tone={active ? "info" : "neutral"} />
          )}
        </>
      )}
    </>
  );

  const linkContent = planned ? (
    <div className={contentClasses} aria-disabled="true">
      {innerContent}
    </div>
  ) : (
    <Link
      href={item.href}
      onClick={onNavigate}
      onMouseEnter={() => router.prefetch(item.href)}
      onTouchStart={() => router.prefetch(item.href)}
      aria-current={active ? "page" : undefined}
      className={contentClasses}
    >
      {innerContent}
    </Link>
  );

  return (
    <li>
      {collapsed ? (
        <Hint label={item.label} side="right">
          {linkContent}
        </Hint>
      ) : (
        linkContent
      )}
    </li>
  );
}