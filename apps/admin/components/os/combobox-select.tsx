"use client";

import * as React from "react";
import { Command } from "cmdk";
import { Check, ChevronsUpDown } from "lucide-react";

import { Popover, PopoverContent, PopoverTrigger, cn, controlSurface } from "@repo/ui";

export function ComboboxSelect({
  name,
  options,
  defaultValue = "",
  placeholder = "Not set",
  searchPlaceholder = "Search",
  emptyLabel = "No match.",
  allowCustom = false,
  onChange,
}: {
  name: string;
  options: string[];
  defaultValue?: string;
  placeholder?: string;
  searchPlaceholder?: string;
  emptyLabel?: string;
  allowCustom?: boolean;
  onChange?: (value: string) => void;
}) {
  const [value, setValue] = React.useState(defaultValue);
  const [query, setQuery] = React.useState("");
  const [open, setOpen] = React.useState(false);
  const listId = React.useId();
  const list = React.useMemo(
    () =>
      defaultValue && !options.includes(defaultValue)
        ? [defaultValue, ...options]
        : options,
    [options, defaultValue],
  );
  const typed = query.trim();
  const canUseTyped =
    allowCustom &&
    typed !== "" &&
    !list.some((o) => o.toLowerCase() === typed.toLowerCase());

  function choose(next: string) {
    setValue(next);
    onChange?.(next);
    setQuery("");
    setOpen(false);
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <input type="hidden" name={name} value={value} />
      <PopoverTrigger asChild>
        <button
          type="button"
          role="combobox"
          aria-expanded={open}
          aria-controls={listId}
          className={cn(
            controlSurface,
            "inline-flex h-[var(--control-h)] cursor-pointer items-center justify-between text-start",
            !value && "text-muted-foreground",
          )}
        >
          <span className="truncate">{value || placeholder}</span>
          <ChevronsUpDown className="ms-2 h-4 w-4 shrink-0 text-muted-foreground" />
        </button>
      </PopoverTrigger>
      <PopoverContent
        align="start"
        className="w-[var(--radix-popover-trigger-width)] p-0"
      >
        <Command loop>
          <Command.Input
            value={query}
            onValueChange={setQuery}
            placeholder={searchPlaceholder}
            className="h-10 w-full border-b border-border bg-transparent px-3 text-sm outline-none placeholder:text-muted-foreground"
          />
          <Command.List
            id={listId}
            data-lenis-prevent
            className="max-h-64 overflow-y-auto p-1"
          >
            <Command.Empty className="px-3 py-6 text-center text-sm text-muted-foreground">
              {emptyLabel}
            </Command.Empty>
            {canUseTyped && (
              <Command.Item
                value={`use ${typed}`}
                onSelect={() => choose(typed)}
                className="cursor-pointer rounded-md px-2 py-1.5 text-sm data-[selected=true]:bg-muted"
              >
                Use &ldquo;{typed}&rdquo;
              </Command.Item>
            )}
            {value && (
              <Command.Item
                value="— clear"
                onSelect={() => choose("")}
                className="cursor-pointer rounded-md px-2 py-1.5 text-sm text-muted-foreground data-[selected=true]:bg-muted"
              >
                Clear
              </Command.Item>
            )}
            {list.map((option) => (
              <Command.Item
                key={option}
                value={option}
                onSelect={() => choose(option)}
                className="flex cursor-pointer items-center justify-between rounded-md px-2 py-1.5 text-sm data-[selected=true]:bg-muted"
              >
                {option}
                {option === value && <Check className="h-4 w-4" />}
              </Command.Item>
            ))}
          </Command.List>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

export type SearchSelectOption = { value: string; label: string };

function filterByLabel(_value: string, search: string, keywords?: string[]) {
  const needle = search.trim().toLowerCase();
  if (!needle) return 1;
  return keywords?.some((k) => k.toLowerCase().includes(needle)) ? 1 : 0;
}

export function SearchSelect({
  value,
  onChange,
  options,
  name,
  placeholder = "Not set",
  searchPlaceholder = "Search",
  emptyLabel = "No match.",
  ariaLabel,
  className,
  disabled = false,
}: {
  value: string;
  onChange: (value: string) => void;
  options: SearchSelectOption[];
  name?: string;
  placeholder?: string;
  searchPlaceholder?: string;
  emptyLabel?: string;
  ariaLabel?: string;
  className?: string;
  disabled?: boolean;
}) {
  const [open, setOpen] = React.useState(false);
  const listId = React.useId();
  const selected = options.find((o) => o.value === value);

  function choose(next: string) {
    setOpen(false);
    if (next !== value) onChange(next);
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      {name && <input type="hidden" name={name} value={value} />}
      <PopoverTrigger asChild>
        <button
          type="button"
          role="combobox"
          aria-expanded={open}
          aria-controls={listId}
          aria-label={ariaLabel}
          disabled={disabled}
          className={cn(
            controlSurface,
            "inline-flex h-[var(--control-h)] cursor-pointer items-center justify-between text-start disabled:cursor-not-allowed disabled:opacity-50",
            !selected && "text-muted-foreground",
            className,
          )}
        >
          <span className="truncate">{selected?.label ?? placeholder}</span>
          <ChevronsUpDown className="ms-2 h-4 w-4 shrink-0 text-muted-foreground" />
        </button>
      </PopoverTrigger>
      <PopoverContent
        align="start"
        className="w-[var(--radix-popover-trigger-width)] min-w-56 p-0"
      >
        <Command loop filter={filterByLabel}>
          <Command.Input
            placeholder={searchPlaceholder}
            className="h-10 w-full border-b border-border bg-transparent px-3 text-sm outline-none placeholder:text-muted-foreground"
          />
          <Command.List
            id={listId}
            data-lenis-prevent
            className="max-h-64 overflow-y-auto p-1"
          >
            <Command.Empty className="px-3 py-6 text-center text-sm text-muted-foreground">
              {emptyLabel}
            </Command.Empty>
            {options.map((option) => (
              <Command.Item
                key={option.value}
                value={option.value}
                keywords={[option.label]}
                onSelect={() => choose(option.value)}
                className="flex cursor-pointer items-center justify-between gap-2 rounded-md px-2 py-1.5 text-sm data-[selected=true]:bg-muted"
              >
                <span className="truncate">{option.label}</span>
                {option.value === value && <Check className="h-4 w-4 shrink-0" />}
              </Command.Item>
            ))}
          </Command.List>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
