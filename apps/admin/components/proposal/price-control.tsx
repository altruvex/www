"use client";

import * as React from "react";
import { Check, Minus } from "lucide-react";
import { cn } from "@/lib/utils";
import { Field, NumberInput, TextInput } from "./editor-primitives";
import {
  discountAmount,
  investmentTotal,
  netTotal,
  rescaleInvestmentItems,
  type Discount,
  type ProposalContent,
  type ValidationIssue,
} from "@/lib/proposal-schema";

/**
 * The price control.
 *
 * Before this existed, the only way to move a proposal's number was to retype
 * every line item until the column happened to add up to what had been agreed
 * on a call — the operator was doing arithmetic the machine should do, and
 * there was nowhere at all to express "and I'm giving them 10% off".
 *
 * Two controls, one object:
 *
 *  1. **Total** — name the figure; the line items are rescaled in proportion so
 *     the table underneath still adds up to it. The items stay individually
 *     editable, so this is a starting point, not a lock.
 *  2. **Discount** — off / percentage / fixed amount, with a label the client
 *     sees. Never folded into the items: the deck, the contract and the
 *     milestone payments each need it as a distinct number.
 *
 * Rendered in two places (the builder's Scope pane and the Investment slide
 * editor) because both are places an operator is thinking about money. One
 * component, so the two can never present different rules.
 */

const DISCOUNT_MODES: { value: Discount["mode"]; label: string }[] = [
  { value: "none", label: "None" },
  { value: "percent", label: "Percentage" },
  { value: "amount", label: "Fixed amount" },
];

function formatCurrency(amount: number, currency: string) {
  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency,
      maximumFractionDigits: 0,
    }).format(amount);
  } catch {
    // An unknown currency code shouldn't blank out the live total.
    return `${currency} ${amount.toLocaleString("en-US")}`;
  }
}

/** A quick-set chip — the estimator's own numbers, one tap away. */
function PresetChip({
  label,
  amount,
  currency,
  active,
  onClick,
}: {
  label: string;
  amount: number;
  currency: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "flex h-8 flex-1 items-center justify-center gap-1.5 rounded-md border px-2 text-base",
        "transition-colors duration-[var(--dur-state)]",
        active
          ? "border-brand bg-brand-soft font-medium text-foreground"
          : "border-border bg-card text-muted-foreground hover:border-border-mid hover:text-foreground",
      )}
    >
      {active && <Check className="size-3 shrink-0 text-brand" aria-hidden />}
      <span className="truncate">
        {label}
        <span className="ms-1.5 font-mono text-micro tabular-nums text-subtle-foreground">
          {formatCurrency(amount, currency)}
        </span>
      </span>
    </button>
  );
}

export interface PricePreset {
  label: string;
  amount: number;
}

export function PriceControl({
  content,
  onChange,
  issues,
  presets = [],
  className,
}: {
  content: ProposalContent;
  onChange: (content: ProposalContent) => void;
  issues: ValidationIssue[];
  /** Optional one-tap figures — the estimator's min / mid / max. */
  presets?: PricePreset[];
  className?: string;
}) {
  const currency = content.meta.currency;
  const subtotal = investmentTotal(content.investmentItems);
  const reduction = discountAmount(content.investmentItems, content.discount);
  const net = netTotal(content.investmentItems, content.discount);
  const { discount } = content;

  // Typing a total is a text edit, not a commit: rescaling on every keystroke
  // would rewrite the whole table while the operator is halfway through a
  // number. The draft is local, and only lands on blur or Enter.
  const [draft, setDraft] = React.useState<number>(subtotal);
  const [editing, setEditing] = React.useState(false);
  if (!editing && draft !== subtotal) setDraft(subtotal);

  const issueFor = (path: string) =>
    issues.find((issue) => issue.path === path || issue.path.startsWith(`${path}.`))?.message;

  const setTotal = (target: number) => {
    if (!Number.isFinite(target) || target < 0) return;
    onChange({
      ...content,
      investmentItems: rescaleInvestmentItems(content.investmentItems, target),
    });
  };

  const setDiscount = (patch: Partial<Discount>) =>
    onChange({ ...content, discount: { ...discount, ...patch } });

  const effectivePercent = subtotal > 0 ? (reduction / subtotal) * 100 : 0;

  return (
    <div className={cn("space-y-4", className)}>
      <div className="space-y-1.5">
        <Field
          label="Total price"
          hint="Rescales every line item in proportion. Each item stays editable afterwards."
        >
          <div className="flex items-center gap-2">
            <NumberInput
              value={draft}
              min={0}
              suffix={currency}
              className="flex-1"
              onChange={(v) => {
                setEditing(true);
                setDraft(v);
              }}
              onCommit={(v) => {
                setEditing(false);
                if (Number.isFinite(v)) setTotal(v);
              }}
            />
          </div>
        </Field>

        {presets.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {presets.map((preset) => (
              <PresetChip
                key={preset.label}
                label={preset.label}
                amount={preset.amount}
                currency={currency}
                active={subtotal === preset.amount}
                onClick={() => setTotal(preset.amount)}
              />
            ))}
          </div>
        )}
      </div>

      {/* ---- discount ---------------------------------------------------- */}
      <div className="space-y-2 border-t border-border pt-3">
        <fieldset>
          <legend className="mb-1.5 text-meta font-medium text-muted-foreground">
            Discount
          </legend>
          <div className="grid grid-cols-3 gap-1.5">
            {DISCOUNT_MODES.map((mode) => {
              const selected = discount.mode === mode.value;
              return (
                <button
                  key={mode.value}
                  type="button"
                  aria-pressed={selected}
                  onClick={() => setDiscount({ mode: mode.value })}
                  className={cn(
                    "flex h-8 items-center justify-center gap-1.5 rounded-md border px-2 text-base",
                    "transition-colors duration-[var(--dur-state)]",
                    selected
                      ? "border-brand bg-brand-soft font-medium text-foreground"
                      : "border-border bg-card text-muted-foreground hover:border-border-mid hover:text-foreground",
                  )}
                >
                  {selected && <Check className="size-3 text-brand" aria-hidden />}
                  {mode.label}
                </button>
              );
            })}
          </div>
        </fieldset>

        {discount.mode !== "none" && (
          <div className="grid gap-3 sm:grid-cols-2">
            <Field
              label={discount.mode === "percent" ? "Percentage off" : "Amount off"}
              error={issueFor("discount.value")}
            >
              <NumberInput
                value={discount.value}
                min={0}
                max={discount.mode === "percent" ? 100 : undefined}
                suffix={discount.mode === "percent" ? "%" : currency}
                invalid={!(discount.value > 0)}
                onChange={(v) => setDiscount({ value: Number.isFinite(v) ? v : 0 })}
              />
            </Field>
            <Field
              label="Label on the deck"
              hint="The client reads this line."
              error={issueFor("discount.label")}
            >
              <TextInput
                value={discount.label}
                onChange={(v) => setDiscount({ label: v })}
                placeholder="Launch discount"
                invalid={!discount.label.trim()}
              />
            </Field>
            <Field
              label="Internal note"
              hint="Never printed — why this discount was given."
              className="sm:col-span-2"
            >
              <TextInput
                value={discount.reason}
                onChange={(v) => setDiscount({ reason: v })}
                placeholder="Agreed on the 3 Sep call — repeat client"
              />
            </Field>
          </div>
        )}
      </div>

      {/* ---- what it adds up to ------------------------------------------ */}
      <dl className="space-y-1.5 border-t border-border pt-3">
        <div className="flex items-baseline justify-between gap-3">
          <dt className="text-base text-muted-foreground">Subtotal</dt>
          <dd className="font-mono text-meta tabular-nums text-foreground">
            {formatCurrency(subtotal, currency)}
          </dd>
        </div>
        {reduction > 0 && (
          <div className="flex items-baseline justify-between gap-3">
            <dt className="flex min-w-0 items-baseline gap-1.5 text-base text-danger">
              <Minus className="size-3 shrink-0 self-center" aria-hidden />
              <span className="truncate">{discount.label.trim() || "Discount"}</span>
              <span className="shrink-0 font-mono text-micro tabular-nums text-subtle-foreground">
                {effectivePercent.toFixed(effectivePercent % 1 === 0 ? 0 : 1)}%
              </span>
            </dt>
            <dd className="font-mono text-meta tabular-nums text-danger">
              −{formatCurrency(reduction, currency)}
            </dd>
          </div>
        )}
        <div className="flex items-baseline justify-between gap-3 border-t border-border pt-1.5">
          <dt className="text-base font-medium text-foreground">
            {reduction > 0 ? "Client pays" : "Total"}
          </dt>
          <dd className="font-sans text-md font-medium tabular-nums text-foreground">
            {formatCurrency(net, currency)}
          </dd>
        </div>
      </dl>
    </div>
  );
}
