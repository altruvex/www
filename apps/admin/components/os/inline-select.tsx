"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Command } from "cmdk";
import { Check, ChevronDown } from "lucide-react";
import { toast } from "sonner";

import {
  Popover,
  PopoverContent,
  PopoverTrigger,
  cn,
  menuEmpty,
  menuItem,
  menuSearch,
} from "@repo/ui";

export type InlineSelectOption = { value: string; label: string };

export type InlineCommitResult = { ok: boolean; message: string };

const NO_OP = "Nothing changed.";

const SEARCH_FROM = 8;

function filterByLabel(_value: string, search: string, keywords?: string[]) {
  const needle = search.trim().toLowerCase();
  if (!needle) return 1;
  return keywords?.some((k) => k.toLowerCase().includes(needle)) ? 1 : 0;
}

export function InlineSelect({
  value,
  options,
  onCommit,
  display,
  ariaLabel,
  disabled = false,
  searchPlaceholder = "Search",
  className,
}: {
  value: string;
  options: InlineSelectOption[];
  onCommit: (next: string) => Promise<InlineCommitResult>;
  display?: (value: string) => React.ReactNode;
  ariaLabel: string;
  disabled?: boolean;
  searchPlaceholder?: string;
  className?: string;
}) {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [pending, startTransition] = React.useTransition();
  const [override, setOverride] = React.useState<{ base: string; next: string } | null>(null);
  const shown = override && override.base === value ? override.next : value;
  const listId = React.useId();

  function choose(next: string) {
    setOpen(false);
    if (next === shown) return;
    const base = value;
    setOverride({ base, next });
    startTransition(async () => {
      let result: InlineCommitResult;
      try {
        result = await onCommit(next);
      } catch {
        result = { ok: false, message: "The server could not be reached. Nothing was saved." };
      }
      if (!result.ok) {
        setOverride(null);
        toast.error(result.message);
        return;
      }
      if (result.message === NO_OP) {
        setOverride(null);
        toast(result.message);
        return;
      }
      toast.success(result.message);
      router.refresh();
    });
  }

  const label = options.find((o) => o.value === shown)?.label ?? shown;
  const stop = (event: React.SyntheticEvent) => event.stopPropagation();

  return (
    <span data-row-ignore className={cn("inline-flex min-w-0 max-w-full", className)} onClick={stop} onKeyDown={stop}>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <button
            type="button"
            role="combobox"
            aria-expanded={open}
            aria-controls={listId}
            aria-label={ariaLabel}
            aria-busy={pending || undefined}
            disabled={disabled || pending}
            className={cn(
              "group -mx-1.5 inline-flex min-w-0 max-w-full cursor-pointer items-center gap-1 rounded-xs px-1.5 py-0.5 text-start",
              "hover:bg-surface-2 focus-visible:outline-2 focus-visible:outline-brand pointer-coarse:min-h-11",
              "disabled:cursor-default",
              pending && "opacity-60",
            )}
          >
            <span className="min-w-0 truncate">{display ? display(shown) : label}</span>
            <ChevronDown
              className="size-3 shrink-0 text-subtle-foreground opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100 group-aria-expanded:opacity-100 pointer-coarse:opacity-100"
              aria-hidden
            />
          </button>
        </PopoverTrigger>
        <PopoverContent align="start" surface="menu" className="w-56">
          <Command loop filter={filterByLabel}>
            {options.length >= SEARCH_FROM && (
              <Command.Input
                placeholder={searchPlaceholder}
                className={menuSearch}
              />
            )}
            <Command.List id={listId} data-lenis-prevent className="max-h-64 overflow-y-auto">
              <Command.Empty className={menuEmpty}>No match.</Command.Empty>
              {options.map((option) => (
                <Command.Item
                  key={option.value}
                  value={option.value}
                  keywords={[option.label]}
                  onSelect={() => choose(option.value)}
                  className={cn(menuItem, "cursor-pointer justify-between")}
                >
                  <span className="truncate">{option.label}</span>
                  {option.value === shown && <Check className="shrink-0" aria-hidden />}
                </Command.Item>
              ))}
            </Command.List>
          </Command>
        </PopoverContent>
      </Popover>
    </span>
  );
}
