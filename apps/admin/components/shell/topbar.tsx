"use client";

import { signOut } from "@/lib/auth-client";
import { groupFor, navItemFor } from "@/lib/nav";
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
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import * as React from "react";

const railControl =
  "inline-flex size-[var(--control-h-sm)] items-center justify-center rounded-md " +
  "text-muted-foreground transition-colors duration-[var(--dur-state)] " +
  "hover:bg-surface hover:text-foreground " +
  "outline-none focus-visible:ring-2 focus-visible:ring-ring/60 focus-visible:ring-offset-1 focus-visible:ring-offset-background";

export function Topbar({
  user,
  unreadCount,
  onOpenPalette,
  onOpenMobileNav,
}: {
  user: { name?: string | null; email?: string | null; role?: string | null };
  unreadCount: number;
  onOpenPalette: () => void;
  onOpenMobileNav: () => void;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = React.useState(false);
  const [isMac, setIsMac] = React.useState(true);

  const item = navItemFor(pathname);
  const group = groupFor(pathname);

  React.useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMounted(true);
    setIsMac(navigator.platform.toUpperCase().indexOf("MAC") >= 0);
  }, []);

  return (
    <header
      className="liquid-glass-toolbar sticky top-0 z-30 flex shrink-0 items-center gap-2 border-x-0 border-t-0 border-b border-border bg-background/85 px-3 backdrop-blur-md"
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
        {group && (
          <>
            <span className="hidden text-subtle-foreground sm:inline">{group.label}</span>
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
            "flex h-(--control-h-sm) items-center justify-between gap-4 rounded-md border border-border bg-input p-3",
            "text-meta text-subtle-foreground outline-none",
            "transition-colors duration-(--dur-state) hover:border-border-mid hover:text-muted-foreground",
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
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button size="icon-sm" variant="brand" aria-label="Create new item">
              <Plus strokeWidth={1.75} />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>Create</DropdownMenuLabel>
            <DropdownMenuItem asChild onMouseEnter={() => router.prefetch("/clients/new")}>
              <Link href="/clients/new">Client</Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild onMouseEnter={() => router.prefetch("/proposals/new")}>
              <Link href="/proposals/new">Proposal</Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild onMouseEnter={() => router.prefetch("/calendar?new=meeting")}>
              <Link href="/calendar?new=meeting">Meeting</Link>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
        <Link
          href="/notifications"
          onMouseEnter={() => router.prefetch("/notifications")}
          className={cn(railControl, "relative")}
          aria-label={`Notifications${unreadCount ? `, ${unreadCount} unread` : ""}`}
        >
          <Bell size={18} strokeWidth={1.75} />
          {unreadCount > 0 && (
            <span className="absolute inset-e-1.5 top-1.5 size-1.5 rounded-full bg-danger ring-2 ring-background" />
          )}
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
              <DropdownMenuRadioGroup value={theme} onValueChange={setTheme}>
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
              <div className="h-20 animate-pulse bg-muted/20 rounded-md" />
            )}
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild onMouseEnter={() => router.prefetch("/settings")}>
              <Link href="/settings">
                <UserIcon strokeWidth={1.75} /> Settings
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem
              destructive
              onSelect={async () => {
                await signOut();
                window.location.href = "/login";
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