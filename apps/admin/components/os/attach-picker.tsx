"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Command } from "cmdk";
import { ChevronDown } from "lucide-react";
import { toast } from "sonner";

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

export type AttachOption = {
  /** The value written into the request, e.g. a project id. */
  value: string;
  label: string;
  hint?: string;
};

/** Where the choice is written: the same JSON request the record's own edit form sends. */
export type AttachRequest = {
  url: string;
  method: "POST" | "PATCH" | "PUT";
  body: Record<string, unknown>;
  /** Dotted path inside `body` that receives the chosen value, e.g. "patch.projectId". */
  field: string;
};

function filterByLabel(_value: string, search: string, keywords?: string[]) {
  const needle = search.trim().toLowerCase();
  if (!needle) return 1;
  return keywords?.some((k) => k.toLowerCase().includes(needle)) ? 1 : 0;
}

function withValue(body: Record<string, unknown>, field: string, value: string) {
  const next = structuredClone(body);
  const keys = field.split(".");
  let cursor = next;
  for (const key of keys.slice(0, -1)) {
    const child = cursor[key];
    cursor[key] = child && typeof child === "object" ? child : {};
    cursor = cursor[key] as Record<string, unknown>;
  }
  cursor[keys[keys.length - 1]!] = value;
  return next;
}

/**
 * Assign or link a record where it is shown ("Link a project", "Assign an
 * owner") instead of sending the operator to an edit form elsewhere. Choosing
 * an option saves it through the record's existing endpoint and refreshes the
 * page; the toast reports what the server said, never an assumed success.
 */
export function AttachPicker({
  label,
  options,
  request,
  successMessage = "Saved.",
  searchPlaceholder = "Search",
  emptyLabel = "No match.",
  variant = "outline",
  size = "sm",
  footer,
}: {
  label: string;
  options: AttachOption[];
  request: AttachRequest;
  successMessage?: string;
  searchPlaceholder?: string;
  emptyLabel?: string;
  variant?: React.ComponentProps<typeof Button>["variant"];
  size?: React.ComponentProps<typeof Button>["size"];
  /** An extra link under the list, e.g. "New project" when the right one does not exist yet. */
  footer?: { label: string; href: string };
}) {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [busy, setBusy] = React.useState(false);
  const listId = React.useId();

  async function choose(value: string) {
    setOpen(false);
    setBusy(true);
    try {
      const res = await fetch(request.url, {
        method: request.method,
        headers: { "content-type": "application/json" },
        body: JSON.stringify(withValue(request.body, request.field, value)),
      });
      if (res.status === 401) {
        toast.error("Your session expired. Sign in again.");
        router.push("/login");
        return;
      }
      const data = (await res.json().catch(() => ({}))) as {
        success?: boolean;
        ok?: boolean;
        message?: string;
      };
      if (!res.ok || data.success === false || data.ok === false) {
        toast.error(data.message ?? "The change could not be saved.");
        return;
      }
      toast.success(successMessage);
      router.refresh();
    } catch {
      toast.error("The request could not be sent. Check your connection.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant={variant}
          size={size}
          disabled={busy}
          aria-expanded={open}
          aria-controls={listId}
          aria-haspopup="listbox"
        >
          {busy ? "Saving…" : label}
          <ChevronDown className="text-muted-foreground" />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" surface="menu" className="w-72">
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
                key={option.value}
                value={option.value}
                keywords={[option.label, option.hint ?? ""]}
                onSelect={() => choose(option.value)}
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
                  onSelect={() => {
                    setOpen(false);
                    router.push(footer.href);
                  }}
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
