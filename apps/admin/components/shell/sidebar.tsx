"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronDown, PanelLeftClose, PanelLeftOpen } from "lucide-react";
import { NavIcon } from "./nav-icon";
import { cn } from "@/lib/utils";
import {
  GROUPS,
  PRIMARY,
  canSee,
  type BadgeKey,
  type NavItem,
  type Role,
} from "@/lib/nav";
import { CountBadge } from "@/components/ui/badge";
import { Hint } from "@/components/ui/tooltip";

/**
 * §29 — grouped navigation with progressive disclosure.
 *
 * Two levels only. A group auto-opens when you are inside it and remembers what
 * you opened by hand; collapsing the whole rail to icons is a separate control.
 * Every "planned" item stays visible but is visually demoted — the operator can
 * see where the system is going without being able to click into a lie.
 */
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
  // Groups are open by default and remember what the operator closed. Collapsing
  // them all by default hid the whole application behind nine chevrons — the
  // grouping is the progressive disclosure, not a second collapsed layer on top.
  const [closed, setClosed] = React.useState<Record<string, boolean>>({});

  React.useEffect(() => {
    try {
      const raw = window.localStorage.getItem("avx.nav.closed");
      // eslint-disable-next-line react-hooks/set-state-in-effect
      if (raw) setClosed(JSON.parse(raw) as Record<string, boolean>);
    } catch {
      /* blocked storage — every group just stays open */
    }
  }, []);

  function toggleGroup(id: string) {
    setClosed((prev) => {
      const next = { ...prev, [id]: !prev[id] };
      try {
        window.localStorage.setItem("avx.nav.closed", JSON.stringify(next));
      } catch {
        /* ignore */
      }
      return next;
    });
  }

  const isActive = React.useCallback(
    (item: NavItem) =>
      item.href === "/"
        ? pathname === "/"
        : pathname === item.href || pathname.startsWith(`${item.href}/`),
    [pathname],
  );

  return (
    <div
      className="flex h-full flex-col bg-sidebar"
      style={{ width: collapsed ? "var(--sidebar-w-collapsed)" : "var(--sidebar-w)" }}
    >
      {/* ---- identity ---------------------------------------------------- */}
      <div
        className="flex shrink-0 items-center gap-2 border-b border-sidebar-border px-3"
        style={{ height: "var(--topbar-h)" }}
      >
        <Link
          href="/"
          onClick={onNavigate}
          className="flex min-w-0 items-center gap-2 rounded-sm"
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

      {/* ---- nav --------------------------------------------------------- */}
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

        {GROUPS.map((group) => {
          const items = group.items.filter((i) => canSee(i, role));
          if (items.length === 0) return null;
          const groupActive = items.some(isActive);
          // A group containing the current route is always open, whatever the
          // operator last chose — you can never be somewhere the nav denies.
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
                className={cn(
                  "telemetry flex w-full items-center gap-1 rounded-sm px-2 py-1 text-subtle-foreground",
                  "transition-colors duration-[var(--dur-state)] hover:text-foreground",
                )}
              >
                {group.label}
                <ChevronDown
                  className={cn(
                    "ms-auto size-3 transition-transform duration-[var(--dur-state)]",
                    !isOpen && "-rotate-90",
                  )}
                  aria-hidden
                />
              </button>
              {isOpen && (
                <ul className="mt-0.5 space-y-0.5">
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
              )}
            </div>
          );
        })}
      </nav>

      {/* ---- collapse ---------------------------------------------------- */}
      <div className="shrink-0 border-t border-sidebar-border p-2">
        <button
          type="button"
          onClick={onToggleCollapse}
          className={cn(
            "flex h-[var(--control-h-sm)] w-full items-center gap-2 rounded-md px-2 text-meta text-muted-foreground",
            "transition-colors duration-[var(--dur-state)] hover:bg-sidebar-accent hover:text-foreground",
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
  const Icon = item.icon;
  const planned = item.state === "planned";

  const link = (
    <Link
      href={item.href}
      onClick={onNavigate}
      aria-current={active ? "page" : undefined}
      className={cn(
        "group relative flex h-7 items-center gap-2 rounded-md px-2 text-base",
        "transition-colors duration-[var(--dur-state)]",
        active
          ? "bg-sidebar-accent font-medium text-sidebar-accent-foreground"
          : "text-muted-foreground hover:bg-sidebar-accent/60 hover:text-foreground",
        collapsed && "justify-center px-0",
      )}
    >
      {/* Active marker: a 2px bar on the start edge, not a coloured pill. */}
      {active && (
        <span
          className="absolute -start-2 top-1/2 h-4 w-0.5 -translate-y-1/2 rounded-e-full bg-foreground"
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
    </Link>
  );

  return (
    <li>
      {collapsed ? (
        <Hint label={item.label} side="right">
          {link}
        </Hint>
      ) : (
        link
      )}
    </li>
  );
}
