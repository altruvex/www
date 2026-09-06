"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Command } from "cmdk";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import {
  Building2,
  FileSignature,
  FileText,
  Loader2,
  Moon,
  Plus,
  Search,
  Shapes,
  Sun,
  Target,
} from "lucide-react";
import { useTheme } from "next-themes";
import { cn } from "@/lib/utils";
import { ALL_NAV_ITEMS } from "@/lib/nav";
import { Kbd } from "@/components/ui/kbd";
import { NavIcon } from "./nav-icon";

/**
 * ⌘K — §20 / §31.
 *
 * Two search spaces in one list: NAVIGATION (static, instant, always present)
 * and RECORDS (debounced server search across clients, proposals, contracts,
 * projects). Navigation never waits on the network, so the palette is usable
 * the millisecond it opens even on a bad connection — the records section fills
 * in underneath.
 */
type Hit = {
  id: string;
  type: "client" | "proposal" | "contract" | "project";
  title: string;
  subtitle?: string;
  href: string;
};

const TYPE_ICON = {
  client: Building2,
  proposal: FileText,
  contract: FileSignature,
  project: Shapes,
} as const;

export function CommandPalette({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const router = useRouter();
  const { setTheme, resolvedTheme } = useTheme();
  const [query, setQuery] = React.useState("");
  const [hits, setHits] = React.useState<Hit[]>([]);
  const [loading, setLoading] = React.useState(false);
  const requestSeq = React.useRef(0);

  React.useEffect(() => {
    // Resetting the query when the dialog closes is exactly the "synchronise
    // with an external system" case: the dialog's open state lives in the
    // shell, not here.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (!open) setQuery("");
  }, [open]);

  // Debounced record search. Aborts in flight requests so a fast typist never
  // sees results for a prefix they already deleted.
  React.useEffect(() => {
    const q = query.trim();
    if (q.length < 2) {
      /* eslint-disable-next-line react-hooks/set-state-in-effect */
      setHits([]);
      setLoading(false);
      return;
    }
    const controller = new AbortController();
    // Sequence guard: a superseded request must never clear the spinner or
    // overwrite newer results. Aborting alone is not enough — the abort of an
    // in-flight request and the arrival of a newer one race, and the loser used
    // to win by writing an empty list.
    const seq = ++requestSeq.current;
    setLoading(true);
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`/api/admin/search?q=${encodeURIComponent(q)}`, {
          signal: controller.signal,
        });
        if (!res.ok) throw new Error(String(res.status));
        const payload = (await res.json()) as { results: Hit[] };
        if (seq === requestSeq.current) {
          setHits(payload.results);
          setLoading(false);
        }
      } catch (error) {
        if ((error as Error).name === "AbortError") return; // a newer query owns the UI
        if (seq === requestSeq.current) {
          setHits([]);
          setLoading(false);
        }
      }
    }, 160);
    return () => {
      controller.abort();
      clearTimeout(timer);
    };
  }, [query]);

  const navMatches = React.useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return ALL_NAV_ITEMS;
    return ALL_NAV_ITEMS.filter(
      (item) =>
        item.label.toLowerCase().includes(needle) ||
        item.blurb.toLowerCase().includes(needle),
    );
  }, [query]);

  function go(href: string) {
    onOpenChange(false);
    router.push(href);
  }

  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay
          className={cn(
            "fixed inset-0 z-50 bg-n-8/30 backdrop-blur-[2px]",
            "data-[state=open]:animate-in data-[state=open]:fade-in-0",
            "data-[state=closed]:animate-out data-[state=closed]:fade-out-0",
          )}
        />
        <DialogPrimitive.Content
          className={cn(
            "fixed start-1/2 top-[12vh] z-50 w-[min(92vw,560px)] -translate-x-1/2",
            "overflow-hidden rounded-xl border border-border bg-popover shadow-[var(--elev-2)]",
            "data-[state=open]:animate-palette-in focus:outline-none",
          )}
        >
          <DialogPrimitive.Title className="sr-only">Command palette</DialogPrimitive.Title>
          <DialogPrimitive.Description className="sr-only">
            Search records and navigate. Type at least two characters to search records.
          </DialogPrimitive.Description>

          <Command shouldFilter={false} loop className="flex flex-col">
            <div className="flex items-center gap-2 border-b border-border px-3">
              <Search size={16} strokeWidth={1.75} className="shrink-0 text-subtle-foreground" aria-hidden />
              <Command.Input
                autoFocus
                value={query}
                onValueChange={setQuery}
                placeholder="Search clients, proposals, contracts, projects…"
                className="h-11 flex-1 bg-transparent text-md outline-none placeholder:text-subtle-foreground"
              />
              {loading && <Loader2 className="size-3.5 animate-spin text-subtle-foreground" />}
              <Kbd>ESC</Kbd>
            </div>

            <Command.List className="max-h-[52vh] overflow-y-auto p-1.5">
              <Command.Empty className="px-3 py-8 text-center text-base text-muted-foreground">
                {query.trim().length < 2
                  ? "Type to search. Everything in the system is reachable from here."
                  : loading
                    ? "Searching…"
                    : `Nothing matches “${query}”.`}
              </Command.Empty>

              {hits.length > 0 && (
                <Group heading="Records">
                  {hits.map((hit) => {
                    const Icon = TYPE_ICON[hit.type];
                    return (
                      <Item key={`${hit.type}-${hit.id}`} onSelect={() => go(hit.href)}>
                        <NavIcon icon={Icon} size={16} className="text-subtle-foreground" />
                        <span className="truncate">{hit.title}</span>
                        {hit.subtitle && (
                          <span className="truncate text-meta text-subtle-foreground">
                            {hit.subtitle}
                          </span>
                        )}
                        <span className="telemetry ms-auto shrink-0 text-subtle-foreground">
                          {hit.type}
                        </span>
                      </Item>
                    );
                  })}
                </Group>
              )}

              <Group heading="Create">
                <Item onSelect={() => go("/clients/new")}>
                  <NavIcon icon={Plus} size={16} className="text-subtle-foreground" />
                  New client
                  <Kbd className="ms-auto">C</Kbd>
                </Item>
                <Item onSelect={() => go("/leads")}>
                  <NavIcon icon={Target} size={16} className="text-subtle-foreground" />
                  Triage leads
                </Item>
              </Group>

              {navMatches.length > 0 && (
              <Group heading="Go to">
                {navMatches.map((item) => {
                  const Icon = item.icon;
                  return (
                    <Item key={item.href} onSelect={() => go(item.href)}>
                      <NavIcon icon={Icon} size={16} className="text-subtle-foreground" />
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

              <Group heading="Preferences">
                <Item
                  onSelect={() => {
                    setTheme(resolvedTheme === "dark" ? "light" : "dark");
                    onOpenChange(false);
                  }}
                >
                  {resolvedTheme === "dark" ? (
                    <Sun className="size-3.5 shrink-0 text-subtle-foreground" aria-hidden />
                  ) : (
                    <Moon className="size-3.5 shrink-0 text-subtle-foreground" aria-hidden />
                  )}
                  Switch to {resolvedTheme === "dark" ? "light" : "dark"} theme
                </Item>
              </Group>
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

function Group({ heading, children }: { heading: string; children: React.ReactNode }) {
  return (
    <Command.Group
      heading={heading}
      className={cn(
        "[&_[cmdk-group-heading]]:telemetry [&_[cmdk-group-heading]]:px-2",
        "[&_[cmdk-group-heading]]:pb-1 [&_[cmdk-group-heading]]:pt-2",
        "[&_[cmdk-group-heading]]:text-subtle-foreground",
      )}
    >
      {children}
    </Command.Group>
  );
}

function Item({
  children,
  onSelect,
}: {
  children: React.ReactNode;
  onSelect: () => void;
}) {
  return (
    <Command.Item
      onSelect={onSelect}
      className={cn(
        "flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-base",
        "data-[selected=true]:bg-surface-2 data-[selected=true]:text-foreground",
      )}
    >
      {children}
    </Command.Item>
  );
}
