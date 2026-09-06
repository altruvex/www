"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
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
import { cn } from "@/lib/utils";
import { navItemFor, groupFor } from "@/lib/nav";
import { signOut } from "@/lib/auth-client";
import { Kbd } from "@/components/ui/kbd";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

/**
 * Every control on the topbar rail is exactly --control-h-sm (28px) — the mobile
 * menu, the search chip, the create button, notifications and the avatar. They
 * are different shapes, but they share one height and one radius, so the row
 * reads as a single rail instead of five separately-sized widgets.
 */
const railControl =
  "inline-flex size-[var(--control-h-sm)] items-center justify-center rounded-md " +
  "text-muted-foreground transition-colors duration-[var(--dur-state)] " +
  "hover:bg-surface hover:text-foreground " +
  "outline-none focus-visible:ring-2 focus-visible:ring-ring/60 focus-visible:ring-offset-1 focus-visible:ring-offset-background";

/**
 * The topbar carries context (where am I) and the three things needed from
 * everywhere: search, quick create, notifications. It does NOT carry navigation
 * — that is the sidebar's only job, and duplicating it doubles the places an
 * operator has to look.
 */
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
  const { theme, setTheme } = useTheme();
  const item = navItemFor(pathname);
  const group = groupFor(pathname);

  return (
    <header
      className="sticky top-0 z-30 flex shrink-0 items-center gap-2 border-b border-border bg-background/85 px-3 backdrop-blur-md"
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

      {/* context, not navigation */}
      <div className="flex min-w-0 items-center gap-1.5 text-meta">
        {group && (
          <>
            <span className="hidden text-subtle-foreground sm:inline">{group.label}</span>
            <span className="hidden text-subtle-foreground sm:inline">/</span>
          </>
        )}
        <span className="truncate font-medium text-foreground">{item?.label ?? "Altruvex"}</span>
      </div>

      <div className="ms-auto flex items-center gap-1.5">
        <button
          type="button"
          onClick={onOpenPalette}
          className={cn(
            "flex h-[var(--control-h-sm)] items-center gap-2 rounded-md border border-border bg-input px-2",
            "text-meta text-subtle-foreground",
            "transition-colors duration-[var(--dur-state)] hover:border-border-mid hover:text-muted-foreground",
          )}
          aria-label="Open command palette"
        >
          <Search size={16} strokeWidth={1.75} />
          <span className="hidden sm:inline">Search</span>
          <span className="hidden items-center gap-0.5 sm:flex">
            <Kbd>⌘</Kbd>
            <Kbd>K</Kbd>
          </span>
        </button>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button size="icon-sm" variant="brand" aria-label="Create">
              <Plus strokeWidth={1.75} />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuLabel>Create</DropdownMenuLabel>
            <DropdownMenuItem asChild>
              <Link href="/clients/new">Client</Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link href="/proposals/new">Proposal</Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link href="/calendar?new=meeting">Meeting</Link>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <Link
          href="/notifications"
          className={cn(railControl, "relative")}
          aria-label={`Notifications${unreadCount ? `, ${unreadCount} unread` : ""}`}
        >
          <Bell size={18} strokeWidth={1.75} />
          {unreadCount > 0 && (
            <span className="absolute end-1.5 top-1.5 size-1.5 rounded-full bg-danger ring-2 ring-background" />
          )}
        </Link>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button type="button" className={railControl} aria-label="Account menu">
              <Avatar name={user.name ?? user.email ?? "?"} size="md" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="min-w-56">
            <div className="px-2 py-1.5">
              <p className="truncate text-base font-medium">{user.name ?? "Signed in"}</p>
              <p className="truncate text-meta text-muted-foreground">{user.email}</p>
              {user.role && (
                <p className="telemetry mt-1 text-subtle-foreground">{user.role}</p>
              )}
            </div>
            <DropdownMenuSeparator />
            <DropdownMenuLabel>Theme</DropdownMenuLabel>
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
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
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
