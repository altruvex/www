"use client";

import * as React from "react";
import { Command } from "cmdk";
import { Check, ChevronsUpDown } from "lucide-react";

import {
  Input,
  Popover,
  PopoverContent,
  PopoverTrigger,
  cn,
  controlSurface,
  menuEmpty,
  menuItem,
  menuSearch,
} from "@repo/ui";
import {
  DIAL_CODES,
  dialCodeOf,
  parsePhone,
  splitStoredPhone,
} from "@/lib/dial-codes";

function useCountryOptions() {
  return React.useMemo(() => {
    const names = new Intl.DisplayNames(["en"], { type: "region" });
    return Object.keys(DIAL_CODES)
      .map((iso) => ({ iso, name: names.of(iso) ?? iso }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, []);
}

export function PhoneInput({
  name,
  defaultValue = "",
  required = false,
  placeholder = "100 000 0000",
}: {
  name: string;
  defaultValue?: string;
  required?: boolean;
  placeholder?: string;
}) {
  const initial = React.useMemo(() => splitStoredPhone(defaultValue), [defaultValue]);
  const [iso, setIso] = React.useState(initial.iso);
  const [text, setText] = React.useState(initial.text);
  const [touched, setTouched] = React.useState(false);
  const [open, setOpen] = React.useState(false);
  const inputRef = React.useRef<HTMLInputElement>(null);
  const options = useCountryOptions();

  const parsed = React.useMemo(() => parsePhone(text, iso), [text, iso]);
  const message = parsed.error;

  React.useEffect(() => {
    inputRef.current?.setCustomValidity(message ?? "");
  }, [message]);

  function onBlur() {
    setTouched(true);
    if (!parsed.error && parsed.e164) {
      setIso(parsed.iso);
      setText(parsed.national);
    }
  }

  const code = dialCodeOf(iso);

  return (
    <div>
      <div className="flex gap-2">
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <button
              type="button"
              aria-haspopup="listbox"
              aria-expanded={open}
              aria-label="Country calling code"
              className={cn(
                controlSurface,
                "inline-flex h-[var(--control-h)] w-28 shrink-0 cursor-pointer items-center justify-between",
              )}
            >
              <span dir="ltr" className="truncate">
                {iso} +{code}
              </span>
              <ChevronsUpDown className="ms-1 h-4 w-4 shrink-0 text-muted-foreground" />
            </button>
          </PopoverTrigger>
          <PopoverContent align="start" surface="menu" className="w-72">
            <Command loop>
              <Command.Input
                placeholder="Search country or code"
                className={menuSearch}
              />
              <Command.List data-lenis-prevent className="max-h-64 overflow-y-auto">
                <Command.Empty className={menuEmpty}>
                  No country found.
                </Command.Empty>
                {options.map((o) => (
                  <Command.Item
                    key={o.iso}
                    value={`${o.name} ${o.iso} +${DIAL_CODES[o.iso]}`}
                    onSelect={() => {
                      setIso(o.iso);
                      setOpen(false);
                      inputRef.current?.focus();
                    }}
                    className={cn(menuItem, "cursor-pointer justify-between")}
                  >
                    <span className="truncate">{o.name}</span>
                    <span className="flex items-center gap-1 text-muted-foreground">
                      <span dir="ltr">+{DIAL_CODES[o.iso]}</span>
                      {o.iso === iso && <Check />}
                    </span>
                  </Command.Item>
                ))}
              </Command.List>
            </Command>
          </PopoverContent>
        </Popover>
        <input type="hidden" name={name} value={parsed.e164} />
        <Input
          ref={inputRef}
          type="tel"
          required={required}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onBlur={onBlur}
          placeholder={placeholder}
          autoComplete="off"
          aria-invalid={touched && message ? true : undefined}
          className="min-w-0 flex-1"
        />
      </div>
      {touched && message && (
        <p role="alert" className="mt-1 text-meta text-destructive">
          {message}
        </p>
      )}
    </div>
  );
}
