"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Command } from "cmdk";
import { ChevronDown } from "lucide-react";

import {
  Button,
  Popover,
  PopoverContent,
  PopoverTrigger,
  cn,
  menuEmpty,
  menuItem,
  menuSearch,
  menuSeparator,
} from "@repo/ui";

export type PickOption = {
  /** Where choosing this option goes — the exact record and section, never a list page. */
  href: string;
  label: string;
  /** A short second line, e.g. the client or the current state. */
  hint?: string;
};

function filterByLabel(_value: string, search: string, keywords?: string[]) {
  const needle = search.trim().toLowerCase();
  if (!needle) return 1;
  return keywords?.some((k) => k.toLowerCase().includes(needle)) ? 1 : 0;
}

/**
 * A call to action that has to land on one record ("connect a pipeline",
 * "issue an invoice") opens the choice in place and goes straight to that
 * record's section, instead of sending the operator to a list page to find it.
 * With a single option there is nothing to choose, so it is a plain link.
 */
export function PickToOpen({
  label,
  options,
  searchPlaceholder = "Search",
  emptyLabel = "No match.",
  variant = "outline",
  size = "default",
  footer,
}: {
  label: string;
  options: PickOption[];
  searchPlaceholder?: string;
  emptyLabel?: string;
  variant?: React.ComponentProps<typeof Button>["variant"];
  size?: React.ComponentProps<typeof Button>["size"];
  /** An extra item under the list, e.g. "New product" when the right one does not exist yet. */
  footer?: PickOption;
}) {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const listId = React.useId();

  function go(href: string) {
    setOpen(false);
    router.push(href);
  }

  if (options.length === 0 && !footer) return null;

  if (options.length === 1 && !footer) {
    return (
      <Button variant={variant} size={size} onClick={() => go(options[0]!.href)}>
        {label}
      </Button>
    );
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant={variant}
          size={size}
          aria-expanded={open}
          aria-controls={listId}
          aria-haspopup="listbox"
        >
          {label}
          <ChevronDown className="text-muted-foreground" />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="center" surface="menu" className="w-72">
        <Command loop filter={filterByLabel}>
          {options.length > 6 && (
            <Command.Input
              placeholder={searchPlaceholder}
              className={menuSearch}
            />
          )}
          <Command.List
            id={listId}
            data-lenis-prevent
            className="max-h-72 overflow-y-auto text-start"
          >
            <Command.Empty className={menuEmpty}>
              {emptyLabel}
            </Command.Empty>
            {options.map((option) => (
              <Command.Item
                key={option.href}
                value={option.href}
                keywords={[option.label, option.hint ?? ""]}
                onSelect={() => go(option.href)}
                className={cn(menuItem, "cursor-pointer flex-col items-start gap-0")}
              >
                <span className="truncate">{option.label}</span>
                {option.hint && (
                  <span className="truncate text-xs text-muted-foreground">{option.hint}</span>
                )}
              </Command.Item>
            ))}
            {footer && (
              <>
                <Command.Separator className={menuSeparator} alwaysRender />
                <Command.Item
                  value={`footer ${footer.href}`}
                  keywords={[footer.label]}
                  forceMount
                  onSelect={() => go(footer.href)}
                  className={cn(menuItem, "cursor-pointer text-muted-foreground")}
                >
                  {footer.label}
                </Command.Item>
              </>
            )}
          </Command.List>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
