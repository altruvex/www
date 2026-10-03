"use client";

import type { EntityKind } from "@/lib/entity-links";
import { ALL_NAV_ITEMS, canSee, type Role } from "@/lib/nav";
import { cn } from "@/lib/utils";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { Kbd } from "@repo/ui";
import { LoadingIcon } from "@repo/ui";
import { Command } from "cmdk";
import {
  ArrowLeft,
  Box,
  Building2,
  CalendarClock,
  CircleUser,
  FileSignature,
  FileText,
  GitCommitHorizontal,
  Globe,
  Inbox,
  ListChecks,
  type LucideIcon,
  Moon,
  Plus,
  RefreshCw,
  Rocket,
  Search,
  Shapes,
  ShieldAlert,
  Sun,
  Target,
  Wallet,
} from "lucide-react";
import { useTheme } from "next-themes";
import { useThemeSwitch } from "@/lib/use-theme-switch";
import { useRouter } from "next/navigation";
import * as React from "react";
import { NavIcon } from "./nav-icon";

/** One search result, as /api/admin/search returns it. */
type Hit = {
  id: string;
  kind: EntityKind;
  /** The record's noun from lib/entity-links ("Incident", "Retainer"). */
  noun: string;
  title: string;
  subtitle?: string;
  href: string;
};

const KIND_ICON: Partial<Record<EntityKind, LucideIcon>> = {
  client: Building2,
  submission: Inbox,
  transparency_lead: Target,
  proposal: FileText,
  contract: FileSignature,
  project: Shapes,
  product: Box,
  payment: Wallet,
  subscription: RefreshCw,
  incident: ShieldAlert,
  deployment: Rocket,
  build: GitCommitHorizontal,
  task: ListChecks,
  meeting: CalendarClock,
  client_service: Globe,
  user: CircleUser,
};

export type PaletteMode = "search" | "proposal";

export function CommandPalette({
  open,
  onOpenChange,
  mode = "search",
  onModeChange,
  role,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /**
   * "proposal" narrows the palette to a client picker: a proposal is written
   * for a client and is created from that client's page, so "New proposal"
   * starts by choosing who it is for rather than at a route that has no client.
   */
  mode?: PaletteMode;
  onModeChange?: (mode: PaletteMode) => void;
  role?: Role;
}) {
  const router = useRouter();
  const { resolvedTheme } = useTheme();
  const switchTheme = useThemeSwitch();
  const [query, setQuery] = React.useState("");
  const [hits, setHits] = React.useState<Hit[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [hasError, setHasError] = React.useState(false);
  const requestSeq = React.useRef(0);

  const trimmedQuery = React.useMemo(() => query.trim(), [query]);
  const picking = mode === "proposal";

  const handleOpenChange = React.useCallback(
    (nextOpen: boolean) => {
      if (!nextOpen) {
        setQuery("");
        setHits([]);
        setHasError(false);
      }
      onOpenChange(nextOpen);
    },
    [onOpenChange]
  );

  React.useEffect(() => {
    if (trimmedQuery.length < 2) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setHits([]);
      setLoading(false);
      setHasError(false);
      return;
    }

    const controller = new AbortController();
    const seq = ++requestSeq.current;

    setLoading(true);
    setHasError(false);

    const timer = setTimeout(async () => {
      try {
        const res = await fetch(
          `/api/admin/search?q=${encodeURIComponent(trimmedQuery)}${picking ? "&type=client" : ""}`,
          {
            signal: controller.signal,
          }
        );
        if (!res.ok) throw new Error(String(res.status));
        const payload = (await res.json()) as { results: Hit[] };

        if (seq === requestSeq.current) {
          setHits(payload.results);
          setLoading(false);
        }
      } catch (error) {
        if ((error as Error).name === "AbortError") return;
        if (seq === requestSeq.current) {
          setHits([]);
          setLoading(false);
          setHasError(true);
        }
      }
    }, 160);

    return () => {
      controller.abort();
      clearTimeout(timer);
    };
  }, [trimmedQuery, picking]);

  // The same role rule as the sidebar: a destination the role cannot open is
  // not offered here either.
  const visibleNav = React.useMemo(
    () => ALL_NAV_ITEMS.filter((item) => canSee(item, role)),
    [role]
  );

  const navMatches = React.useMemo(() => {
    const needle = trimmedQuery.toLowerCase();
    if (!needle) return visibleNav;
    return visibleNav.filter(
      (item) =>
        item.label.toLowerCase().includes(needle) ||
        item.blurb.toLowerCase().includes(needle)
    );
  }, [trimmedQuery, visibleNav]);

  const switchMode = React.useCallback(
    (next: PaletteMode) => {
      setQuery("");
      setHits([]);
      setHasError(false);
      onModeChange?.(next);
    },
    [onModeChange]
  );

  const emptyMessage =
    trimmedQuery.length < 2
      ? picking
        ? "Type at least two letters of the client's name."
        : "Type to search. Everything in the system is reachable from here."
      : loading
        ? "Searching…"
        : hasError
          ? "Something went wrong. Please try again."
          : picking
            ? `No client matches “${query}”.`
            : `Nothing matches “${query}”.`;

  const go = React.useCallback(
    (href: string) => {
      handleOpenChange(false);
      router.push(href);
    },
    [handleOpenChange, router]
  );

  const prefetch = React.useCallback(
    (href: string) => {
      router.prefetch(href);
    },
    [router]
  );

  return (
    <DialogPrimitive.Root open={open} onOpenChange={handleOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay
          className={cn(
            "fixed inset-0 z-50 bg-n-8/30 backdrop-blur-[2px]",
            "data-[state=open]:animate-in data-[state=open]:fade-in-0",
            "data-[state=closed]:animate-out data-[state=closed]:fade-out-0"
          )}
        />
        <DialogPrimitive.Content
          className={cn(
            "fixed inset-s-1/2 top-[12vh] z-50 w-[min(92vw,560px)] -translate-x-1/2",
            "overflow-hidden rounded-xl border border-border bg-popover shadow-(--elev-2)",
            "data-[state=open]:animate-palette-in focus:outline-none"
          )}
        >
          <DialogPrimitive.Title className="sr-only">
            Command palette
          </DialogPrimitive.Title>
          <DialogPrimitive.Description className="sr-only">
            Search records and navigate. Type at least two characters to search
            records.
          </DialogPrimitive.Description>
          <Command shouldFilter={false} loop className="flex flex-col">
            <div className="flex items-center gap-2 border-b border-border px-3">
              <Search
                size={16}
                strokeWidth={1.75}
                className="shrink-0 text-subtle-foreground"
                aria-hidden
              />
              {picking && (
                <span className="telemetry shrink-0 rounded-sm border border-border px-1.5 py-0.5 text-subtle-foreground">
                  New proposal for
                </span>
              )}
              <Command.Input
                autoFocus
                value={query}
                onValueChange={setQuery}
                onKeyDown={(event) => {
                  // Backspace on an empty picker returns to plain search.
                  if (picking && event.key === "Backspace" && query === "") {
                    event.preventDefault();
                    switchMode("search");
                  }
                }}
                placeholder={
                  picking
                    ? "Which client is it for?"
                    : "Search clients, projects, incidents, invoices, people…"
                }
                className="h-11 flex-1 bg-transparent text-md outline-none placeholder:text-subtle-foreground"
              />
              {loading && (
                <LoadingIcon size="sm" className="text-subtle-foreground" />
              )}
              <Kbd>ESC</Kbd>
            </div>
            <Command.List className="max-h-[52vh] overflow-y-auto p-1.5">
              <Command.Empty className="px-3 py-8 text-center text-base text-muted-foreground">
                {emptyMessage}
              </Command.Empty>
              {/* The picker always offers "Add the client first", so cmdk's
                  empty slot never shows there; the hint is rendered directly. */}
              {picking && hits.length === 0 && (
                <p className="px-3 py-4 text-center text-base text-muted-foreground">
                  {emptyMessage}
                </p>
              )}
              {hits.length > 0 && (
                <Group heading={picking ? "Clients" : "Records"}>
                  {hits.map((hit) => {
                    const Icon = KIND_ICON[hit.kind] ?? Search;
                    const href = picking
                      ? `/clients/${hit.id}/new-proposal`
                      : hit.href;
                    return (
                      <Item
                        key={`${hit.kind}-${hit.id}`}
                        value={`record-${hit.kind}-${hit.id}`}
                        onSelect={() => go(href)}
                        onMouseEnter={() => prefetch(href)}
                      >
                        <NavIcon
                          icon={Icon}
                          size={16}
                          className="text-subtle-foreground"
                        />
                        <span className="truncate">{hit.title}</span>
                        {hit.subtitle && (
                          <span className="truncate text-meta text-subtle-foreground">
                            {hit.subtitle}
                          </span>
                        )}
                        <span className="telemetry ms-auto shrink-0 text-subtle-foreground">
                          {hit.noun}
                        </span>
                      </Item>
                    );
                  })}
                </Group>
              )}
              {picking ? (
                <Group heading="Or">
                  <Item
                    value="picker-new-client"
                    onSelect={() => go("/clients/new")}
                    onMouseEnter={() => prefetch("/clients/new")}
                  >
                    <NavIcon icon={Plus} size={16} className="text-subtle-foreground" />
                    Add the client first
                  </Item>
                  <Item value="picker-back" onSelect={() => switchMode("search")}>
                    <NavIcon icon={ArrowLeft} size={16} className="text-subtle-foreground" />
                    Back to search
                  </Item>
                </Group>
              ) : (
                <Group heading="Create">
                  <Item
                    value="create-client"
                    onSelect={() => go("/clients/new")}
                    onMouseEnter={() => prefetch("/clients/new")}
                  >
                    <NavIcon icon={Plus} size={16} className="text-subtle-foreground" />
                    New client
                  </Item>
                  <Item value="create-proposal" onSelect={() => switchMode("proposal")}>
                    <NavIcon icon={FileText} size={16} className="text-subtle-foreground" />
                    New proposal…
                    <span className="truncate text-meta text-subtle-foreground">
                      choose the client
                    </span>
                  </Item>
                  <Item
                    value="create-lead"
                    onSelect={() => go("/leads")}
                    onMouseEnter={() => prefetch("/leads")}
                  >
                    <NavIcon icon={Target} size={16} className="text-subtle-foreground" />
                    Triage leads
                  </Item>
                </Group>
              )}
              {!picking && navMatches.length > 0 && (
                <Group heading="Go to">
                  {navMatches.map((item) => {
                    const Icon = item.icon;
                    return (
                      <Item
                        key={item.href}
                        value={`nav-${item.label}`}
                        onSelect={() => go(item.href)}
                        onMouseEnter={() => prefetch(item.href)}
                      >
                        <NavIcon
                          icon={Icon}
                          size={16}
                          className="text-subtle-foreground"
                        />
                        {item.label}
                        <span className="truncate text-meta text-subtle-foreground">
                          {item.blurb}
                        </span>
                        {item.state === "planned" && (
                          <span className="telemetry ms-auto shrink-0 text-subtle-foreground">
                            soon
                          </span>
                        )}
                      </Item>
                    );
                  })}
                </Group>
              )}
              {!picking && (
              <Group heading="Preferences">
                <Item
                  value="toggle-theme"
                  onSelect={() => {
                    switchTheme(resolvedTheme === "dark" ? "light" : "dark");
                    handleOpenChange(false);
                  }}
                >
                  {resolvedTheme === "dark" ? (
                    <Sun
                      className="size-3.5 shrink-0 text-subtle-foreground"
                      aria-hidden
                    />
                  ) : (
                    <Moon
                      className="size-3.5 shrink-0 text-subtle-foreground"
                      aria-hidden
                    />
                  )}
                  Switch to {resolvedTheme === "dark" ? "light" : "dark"} theme
                </Item>
              </Group>
              )}
            </Command.List>
            <div className="flex items-center gap-3 border-t border-border bg-surface px-3 py-1.5 text-micro text-subtle-foreground">
              <span className="flex items-center gap-1">
                <Kbd>↑</Kbd>
                <Kbd>↓</Kbd> navigate
              </span>
              <span className="flex items-center gap-1">
                <Kbd>↵</Kbd> open
              </span>
              <span className="ms-auto flex items-center gap-1">
                <Kbd>⌘</Kbd>
                <Kbd>K</Kbd> anywhere
              </span>
            </div>
          </Command>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}

function Group({
  heading,
  children,
}: {
  heading: string;
  children: React.ReactNode;
}) {
  return (
    <Command.Group
      heading={heading}
      className={cn(
        "[&_[cmdk-group-heading]]:telemetry **:[[cmdk-group-heading]]:px-2",
        "**:[[cmdk-group-heading]]:pb-1 **:[[cmdk-group-heading]]:pt-2",
        "**:[[cmdk-group-heading]]:text-subtle-foreground"
      )}
    >
      {children}
    </Command.Group>
  );
}

function Item({
  children,
  onSelect,
  onMouseEnter,
  value,
}: {
  children: React.ReactNode;
  onSelect: () => void;
  onMouseEnter?: () => void;
  value?: string;
}) {
  return (
    <Command.Item
      value={value}
      onSelect={onSelect}
      onMouseEnter={onMouseEnter}
      className={cn(
        "flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-base",
        "data-[selected=true]:bg-surface-2 data-[selected=true]:text-foreground"
      )}
    >
      {children}
    </Command.Item>
  );
}