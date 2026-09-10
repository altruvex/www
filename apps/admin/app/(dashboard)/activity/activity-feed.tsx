"use client";

import * as React from "react";
import {
  Search,
  X,
  Activity as ActivityIcon,
  MessageCircle,
  FileText,
  FileSignature,
  UserPlus,
  Wallet,
  CalendarDays,
} from "lucide-react";
import { Timeline, type TimelineEvent } from "@/components/os/timeline";
import { Panel } from "@/components/os/panel";
import { StatTile } from "@/components/os/stat-tile";
import { Button } from "@repo/ui";
import { Input } from "@repo/ui";
import { segmentClass } from "@repo/ui";
import { cn } from "@/lib/utils";

const CATEGORIES = [
  { id: "all", label: "All activity", icon: ActivityIcon },
  { id: "messages", label: "Messages", icon: MessageCircle },
  { id: "proposals", label: "Proposals", icon: FileText },
  { id: "contracts", label: "Contracts & projects", icon: FileSignature },
  { id: "clients", label: "Clients & leads", icon: UserPlus },
  { id: "payments", label: "Payments", icon: Wallet },
  { id: "meetings", label: "Meetings", icon: CalendarDays },
] as const;

/** Matches the slice the page hands us; the tile must not claim more. */
const FEED_LIMIT = 200;

export function ActivityFeed({
  events,
  todayCount,
}: {
  events: TimelineEvent[];
  todayCount: number;
}) {
  const [activeCategory, setActiveCategory] = React.useState<string>("all");
  const [searchQuery, setSearchQuery] = React.useState<string>("");

  // Calculate counts per category
  const categoryCounts = React.useMemo(() => {
    const counts: Record<string, number> = { all: events.length };
    for (const cat of CATEGORIES) {
      if (cat.id !== "all") counts[cat.id] = 0;
    }
    for (const e of events) {
      if (e.category && e.category in counts) {
        counts[e.category] = (counts[e.category] ?? 0) + 1;
      }
    }
    return counts;
  }, [events]);

  // Filter events by selected category and search query
  const filteredEvents = React.useMemo(() => {
    return events.filter((event) => {
      // Category filter
      if (activeCategory !== "all" && event.category !== activeCategory) {
        return false;
      }

      // Search query filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const titleMatch = event.title.toLowerCase().includes(q);
        const detailMatch = event.detail?.toLowerCase().includes(q) ?? false;
        const metaMatch = event.meta?.toLowerCase().includes(q) ?? false;
        return titleMatch || detailMatch || metaMatch;
      }

      return true;
    });
  }, [events, activeCategory, searchQuery]);

  const filtered = activeCategory !== "all" || searchQuery.trim().length > 0;
  const activeLabel =
    CATEGORIES.find((cat) => cat.id === activeCategory)?.label ?? "All activity";

  return (
    <div className="space-y-4">
      {/* What this page is holding, in the app's own tiles — a hand-rolled card
          beside a StatTile is two answers to the same question. */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <StatTile
          label="Today"
          value={todayCount}
          sub={`event${todayCount === 1 ? "" : "s"} since midnight`}
          tone={todayCount > 0 ? "info" : "neutral"}
        />
        <StatTile
          label="In this feed"
          value={events.length}
          sub={events.length >= FEED_LIMIT ? `Newest ${FEED_LIMIT}` : "Every record type"}
        />
        <StatTile
          label="Matching the filter"
          value={filteredEvents.length}
          sub={
            filtered
              ? `${activeLabel}${searchQuery.trim() ? ` · “${searchQuery.trim()}”` : ""}`
              : "No filter applied"
          }
          tone={filtered && filteredEvents.length === 0 ? "warning" : "neutral"}
        />
      </div>

      {/* Filter Tabs & Search Bar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        {/* Category tabs. flex-wrap and overflow-x-auto cancel each other out —
            below sm this scrolls on one axis, above it wraps. */}
        <div
          role="radiogroup"
          aria-label="Activity category"
          className="-mx-1 flex items-center gap-1.5 overflow-x-auto px-1 pb-1 sm:mx-0 sm:flex-wrap sm:overflow-visible sm:px-0 sm:pb-0"
        >
          {CATEGORIES.map((cat) => {
            const Icon = cat.icon;
            const count = categoryCounts[cat.id] ?? 0;
            const isActive = activeCategory === cat.id;

            return (
              <button
                key={cat.id}
                type="button"
                role="radio"
                aria-checked={isActive}
                onClick={() => setActiveCategory(cat.id)}
                className={cn(segmentClass({ selected: isActive }), "whitespace-nowrap")}
              >
                <Icon className="size-3.5" />
                <span>{cat.label}</span>
                <span className="rounded-full bg-surface-2 px-1.5 font-mono text-micro tabular-nums text-muted-foreground">
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Instant Search Bar */}
        <div className="relative shrink-0 sm:w-64">
          <Search className="pointer-events-none absolute start-2.5 top-1/2 size-3.5 -translate-y-1/2 text-subtle-foreground" />
          <Input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Filter activity…"
            aria-label="Filter activity"
            className="ps-8 pe-8"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery("")}
              aria-label="Clear filter"
              className="absolute end-2.5 top-1/2 -translate-y-1/2 text-subtle-foreground hover:text-foreground"
            >
              <X className="size-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Main Timeline Panel */}
      <Panel flush bodyClassName="p-4 sm:p-6">
        {filteredEvents.length === 0 ? (
          <div className="py-12 text-center">
            <div className="mx-auto flex size-10 items-center justify-center rounded-full bg-muted">
              <Search className="size-5 text-muted-foreground" />
            </div>
            <h3 className="mt-3 text-md font-semibold text-foreground">No events found</h3>
            <p className="mt-1 text-meta text-muted-foreground">
              No activity records match your current filter or search criteria.
            </p>
            {(activeCategory !== "all" || searchQuery) && (
              <Button
                variant="outline"
                className="mt-4"
                onClick={() => {
                  setActiveCategory("all");
                  setSearchQuery("");
                }}
              >
                Clear all filters
              </Button>
            )}
          </div>
        ) : (
          <Timeline events={filteredEvents} groupByDate={true} />
        )}
      </Panel>
    </div>
  );
}
