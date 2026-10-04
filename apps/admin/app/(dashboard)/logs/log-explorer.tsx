"use client";

import * as React from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { CalendarRange } from "lucide-react";
import { toast } from "sonner";

import {
  Button,
  Input,
  Popover,
  PopoverContent,
  PopoverTrigger,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@repo/ui";

import { linkLogToIncident } from "@/app/(dashboard)/_actions/engineering";

const ANY = "__any__";
const UNLINKED = "__unlinked__";

function useSetParams() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  return React.useCallback(
    (patch: Record<string, string | null>) => {
      const next = new URLSearchParams(searchParams.toString());
      for (const [key, value] of Object.entries(patch)) {
        if (!value || value === ANY) next.delete(key);
        else next.set(key, value);
      }
      next.delete("page");
      const qs = next.toString();
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    },
    [pathname, router, searchParams],
  );
}

export function LogScope({
  products,
  sources,
}: {
  products: { id: string; name: string }[];
  sources: string[];
}) {
  const set = useSetParams();
  const searchParams = useSearchParams();
  const product = searchParams.get("product") ?? "";
  const source = searchParams.get("source") ?? "";

  return (
    <div className="flex min-w-0 flex-wrap items-center gap-2">
      <Select
        value={product || ANY}
        onValueChange={(value) => set({ product: value, source: null })}
      >
        <SelectTrigger className="h-[var(--control-h-sm)] w-40 pointer-coarse:h-11" aria-label="Product">
          <SelectValue placeholder="All products" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ANY}>All products</SelectItem>
          {products.map((p) => (
            <SelectItem key={p.id} value={p.id}>
              {p.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {(sources.length > 0 || source) && (
        <Select value={source || ANY} onValueChange={(value) => set({ source: value })}>
          <SelectTrigger className="h-[var(--control-h-sm)] w-36 pointer-coarse:h-11" aria-label="Source">
            <SelectValue placeholder="All sources" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ANY}>All sources</SelectItem>
            {source && !sources.includes(source) && <SelectItem value={source}>{source}</SelectItem>}
            {sources.map((s) => (
              <SelectItem key={s} value={s}>
                {s}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}
    </div>
  );
}

function toLocalInput(iso: string): string {
  if (!iso) return "";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  return new Date(date.getTime() - date.getTimezoneOffset() * 60_000).toISOString().slice(0, 16);
}

function fromLocalInput(value: string): string | null {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

export function CustomRange({ from, to }: { from: string; to: string }) {
  const set = useSetParams();
  const [open, setOpen] = React.useState(false);
  const [fromValue, setFromValue] = React.useState(() => toLocalInput(from));
  const [toValue, setToValue] = React.useState(() => toLocalInput(to));
  const active = Boolean(from || to);

  return (
    <Popover
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (next) {
          setFromValue(toLocalInput(from));
          setToValue(toLocalInput(to));
        }
      }}
    >
      <PopoverTrigger asChild>
        <Button
          variant={active ? "outline" : "ghost"}
          size="sm"
          aria-pressed={active}
          className="pointer-coarse:min-h-11"
        >
          <CalendarRange className="size-3.5" />
          Custom range
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-72">
        <form
          className="space-y-2"
          onSubmit={(event) => {
            event.preventDefault();
            const start = fromLocalInput(fromValue);
            const end = fromLocalInput(toValue);
            if (!start && !end) {
              toast.error("Pick a start, an end, or both.");
              return;
            }
            if (start && end && start >= end) {
              toast.error("The start has to come before the end.");
              return;
            }
            set({ range: null, from: start, to: end });
            setOpen(false);
          }}
        >
          <label className="flex flex-col gap-1">
            <span className="telemetry text-subtle-foreground">From</span>
            <Input
              type="datetime-local"
              value={fromValue}
              onChange={(event) => setFromValue(event.target.value)}
              suppressHydrationWarning
            />
          </label>
          <label className="flex flex-col gap-1">
            <span className="telemetry text-subtle-foreground">To</span>
            <Input
              type="datetime-local"
              value={toValue}
              onChange={(event) => setToValue(event.target.value)}
              suppressHydrationWarning
            />
          </label>
          <div className="flex justify-end gap-2 pt-1">
            {active && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => {
                  set({ from: null, to: null });
                  setOpen(false);
                }}
              >
                Clear
              </Button>
            )}
            <Button type="submit" variant="outline" size="sm">
              Apply range
            </Button>
          </div>
        </form>
      </PopoverContent>
    </Popover>
  );
}

export function IncidentLinker({
  logId,
  productName,
  current,
  options,
}: {
  logId: string;
  productName: string;
  current: { id: string; number: number; title: string } | null;
  options: { id: string; number: number; title: string }[];
}) {
  const router = useRouter();
  const [pending, startTransition] = React.useTransition();

  const choices = current && !options.some((o) => o.id === current.id) ? [current, ...options] : options;

  if (choices.length === 0) {
    return (
      <p className="text-meta text-subtle-foreground">
        No open incident on {productName} to link this line to.
      </p>
    );
  }

  return (
    <Select
      value={current?.id ?? UNLINKED}
      disabled={pending}
      onValueChange={(value) => {
        const incidentId = value === UNLINKED ? null : value;
        startTransition(async () => {
          const result = await linkLogToIncident({ logId, incidentId });
          if (result.ok) {
            toast.success(result.message);
            router.refresh();
          } else {
            toast.error(result.message);
          }
        });
      }}
    >
      <SelectTrigger className="w-full" aria-label="Link this line to an incident">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value={UNLINKED}>Not linked</SelectItem>
        {choices.map((incident) => (
          <SelectItem key={incident.id} value={incident.id}>
            #{incident.number} {incident.title}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
