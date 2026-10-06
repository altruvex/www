"use client";

import { signOut } from "@/lib/auth-client";
import { canSee, groupFor, navItemFor, quickCreateFor, type Role } from "@/lib/nav";
import { CountBadge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  Avatar,
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  Kbd,
} from "@repo/ui";
import {
  Bell,
  LogOut,
  Menu,
  Monitor,
  Moon,
  Plus,
  Search,
  Sun,
  User as UserIcon,
} from "lucide-react";
import { useTheme } from "next-themes";
import { useThemeSwitch } from "@/lib/use-theme-switch";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import * as React from "react";

const railControl =
  "inline-flex size-[var(--control-h-sm)] items-center justify-center rounded-ctl-sm " +
  "text-muted-foreground transition-colors duration-[var(--dur-state)] " +
  "hover:bg-surface hover:text-foreground " +
  "outline-none focus-visible:ring-2 focus-visible:ring-ring/60 focus-visible:ring-offset-1 focus-visible:ring-offset-background";

export function Topbar({
  user,
  role,
  unreadCount,
  onOpenPalette,
  onCreateProposal,
  onOpenMobileNav,
}: {
  user: { name?: string | null; email?: string | null; role?: string | null };
  role?: Role;
  unreadCount: number;
  onOpenPalette: () => void;
  onCreateProposal: () => void;
  onOpenMobileNav: () => void;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const { theme } = useTheme();
  const switchTheme = useThemeSwitch();
  const [mounted, setMounted] = React.useState(false);
  const [isMac, setIsMac] = React.useState(true);

  const item = navItemFor(pathname);
  const group = groupFor(pathname);
  const groupHref = group?.items.find((i) => canSee(i, role))?.href;
  const createItems = React.useMemo(() => quickCreateFor(role, pathname), [role, pathname]);
  const canCreate = createItems.length > 0;
  const settingsItem = navItemFor("/settings");
  const seesSettings = settingsItem ? canSee(settingsItem, role) : false;

  React.useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMounted(true);
    setIsMac(navigator.platform.toUpperCase().indexOf("MAC") >= 0);
  }, []);

  return (
    <header
      className="sticky top-0 z-30 flex shrink-0 items-center gap-2 border-b border-border-subtle bg-background px-3"
      style={{ height: "var(--topbar-h)" }}
    >
      <button
        type="button"
        onClick={onOpenMobileNav}
        className={cn(railControl, "-ms-1 lg:hidden")}
        aria-label="Open navigation"
      >
        <Menu size={18} strokeWidth={1.75} />
      </button>

      <nav aria-label="Breadcrumb" className="flex min-w-0 items-center gap-1.5 text-meta">
        {group && group.label.toLowerCase() !== item?.label.toLowerCase() && (
          <>
            {groupHref ? (
              <Link
                href={groupHref}
                className="hidden rounded-ctl-xs text-subtle-foreground no-underline outline-none transition-colors duration-[var(--dur-state)] hover:text-foreground focus-visible:outline-2 focus-visible:outline-brand sm:inline"
              >
                {group.label}
              </Link>
            ) : (
              <span className="hidden text-subtle-foreground sm:inline">{group.label}</span>
            )}
            <span className="hidden text-subtle-foreground sm:inline" aria-hidden="true">/</span>
          </>
        )}
        <span className="truncate font-medium text-foreground">{item?.label ?? "Altruvex"}</span>
      </nav>

      <div className="ms-auto flex items-center gap-1.5">
        <button
          type="button"
          onClick={onOpenPalette}
          className={cn(
            "flex h-(--control-h-sm) items-center justify-between gap-4 rounded-ctl-sm border border-border-subtle bg-input p-3",
            "text-meta text-subtle-foreground outline-none",
            "transition-colors duration-(--dur-state) hover:border-foreground/45 hover:text-muted-foreground",
            "focus-visible:ring-2 focus-visible:ring-ring/60 focus-visible:ring-offset-1 focus-visible:ring-offset-background"
          )}
          aria-label="Open command palette"
        >
          <div className="flex items-center gap-2">
            <Search size={16} strokeWidth={1.75} />
            <span className="hidden sm:inline">Search</span>
          </div>
          <span className="hidden items-center gap-0.5 sm:flex">
            <Kbd>{isMac ? "⌘" : "Ctrl"}</Kbd>
            <Kbd>K</Kbd>
          </span>
        </button>
        {canCreate && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button size="icon-sm" variant="brand" aria-label="Create new item">
              <Plus strokeWidth={1.75} />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>Create</DropdownMenuLabel>
            {createItems.map((action) =>
              action.href ? (
                <DropdownMenuItem
                  key={action.id}
                  asChild
                  onMouseEnter={() => router.prefetch(action.href!)}
                >
                  <Link href={action.href}>
                    <action.icon strokeWidth={1.75} />
                    {action.label}
                    {action.scoped && (
                      <span className="ms-auto ps-3 text-meta text-subtle-foreground">
                        {action.hint}
                      </span>
                    )}
                  </Link>
                </DropdownMenuItem>
              ) : (
                <DropdownMenuItem
                  key={action.id}
                  onSelect={() => window.setTimeout(onCreateProposal, 0)}
                >
                  <action.icon strokeWidth={1.75} />
                  {action.label}…
                  {action.scoped && (
                    <span className="ms-auto ps-3 text-meta text-subtle-foreground">
                      {action.hint}
                    </span>
                  )}
                </DropdownMenuItem>
              ),
            )}
          </DropdownMenuContent>
        </DropdownMenu>
        )}
        <Link
          href="/notifications"
          onMouseEnter={() => router.prefetch("/notifications")}
          className={cn(railControl, "relative")}
          aria-label={`Notifications${unreadCount ? `, ${unreadCount} unread` : ""}`}
        >
          <Bell size={18} strokeWidth={1.75} />
          <CountBadge
            count={unreadCount}
            tone="danger"
            className="absolute -top-0.5 -end-0.5 ms-0 ring-2 ring-background"
          />
        </Link>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button type="button" className={railControl} aria-label="Account menu">
              <Avatar name={user.name ?? user.email ?? "?"} size="md" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="min-w-56" align="end">
            <div className="px-2 py-1.5">
              <p className="truncate text-base font-medium">{user.name ?? "Signed in"}</p>
              <p className="truncate text-meta text-muted-foreground">{user.email}</p>
              {user.role && (
                <p className="telemetry mt-1 text-subtle-foreground">{user.role}</p>
              )}
            </div>
            <DropdownMenuSeparator />
            <DropdownMenuLabel>Theme</DropdownMenuLabel>
            {mounted ? (
              <DropdownMenuRadioGroup value={theme} onValueChange={switchTheme}>
                <DropdownMenuRadioItem value="light">
                  <Sun strokeWidth={1.75} /> Light
                </DropdownMenuRadioItem>
                <DropdownMenuRadioItem value="dark">
                  <Moon strokeWidth={1.75} /> Dark
                </DropdownMenuRadioItem>
                <DropdownMenuRadioItem value="system">
                  <Monitor strokeWidth={1.75} /> System
                </DropdownMenuRadioItem>
              </DropdownMenuRadioGroup>
            ) : (
              <div className="h-20 animate-pulse bg-muted/20 rounded-ctl-xl" />
            )}
            <DropdownMenuSeparator />
            {seesSettings && (
              <DropdownMenuItem asChild onMouseEnter={() => router.prefetch("/settings")}>
                <Link href="/settings">
                  <UserIcon strokeWidth={1.75} /> Settings
                </Link>
              </DropdownMenuItem>
            )}
            <DropdownMenuItem
              destructive
              onSelect={async () => {
                await signOut();
                if (typeof caches !== "undefined") {
                  await caches
                    .keys()
                    .then((keys) =>
                      Promise.all(
                        keys
                          .filter((key) => key !== "static-assets" && key !== "font-cache")
                          .map((key) => caches.delete(key)),
                      ),
                    )
                    .catch(() => undefined);
                }
                window.location.replace("/login");
              }}
            >
              <LogOut strokeWidth={1.75} /> Sign out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}