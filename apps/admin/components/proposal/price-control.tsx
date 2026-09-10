"use client";

import {
  discountAmount,
  investmentTotal,
  netTotal,
  rescaleInvestmentItems,
  type Discount,
  type ProposalContent,
  type ValidationIssue,
} from "@/lib/proposal-schema";
import { cn } from "@/lib/utils";
import { Check, Minus } from "lucide-react";
import * as React from "react";
import { Field, NumberInput, TextInput } from "./editor-primitives";

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
    return `${currency} ${amount.toLocaleString("en-US")}`;
  }
}

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
        "transition-colors duration-(--dur-state)",
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
  presets?: PricePreset[];
  className?: string;
}) {
  const currency = content.meta.currency;
  const subtotal = investmentTotal(content.investmentItems);
  const reduction = discountAmount(content.investmentItems, content.discount);
  const net = netTotal(content.investmentItems, content.discount);
  const { discount } = content;

  const [draft, setDraft] = React.useState<number>(subtotal);
  const [editing, setEditing] = React.useState(false);
  const [vatPercent, setVatPercent] = React.useState<number>(0);

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
  const calculatedVat = (net * vatPercent) / 100;
  const finalTotalWithVat = net + calculatedVat;

  const discountLabelText =
    discount.mode === "percent"
      ? discount.value > 0
        ? `Percentage off (${formatCurrency(subtotal * (discount.value / 100), currency)})`
        : "Percentage off"
      : "Amount off";

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
                    "transition-colors duration-(--dur-state)",
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
              label={discountLabelText}
              error={issueFor("discount.value")}
            >
              <NumberInput
                value={discount.value}
                min={0}
                max={discount.mode === "percent" ? 100 : undefined}
                suffix={discount.mode === "percent" ? "%" : currency}
                invalid={!(discount.value > 0)}
                onChange={(v) => setDiscount({ value: Number.isFinite(v) ? Math.min(v, discount.mode === "percent" ? 100 : v) : 0 })}
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
      <div className="space-y-2 border-t border-border pt-3">
        <Field label="VAT / Tax Rate (%)" hint="Optional official tax applied to net total.">
          <NumberInput
            value={vatPercent}
            min={0}
            max={100}
            suffix="%"
            onChange={(v) => setVatPercent(Number.isFinite(v) ? Math.max(0, Math.min(v, 100)) : 0)}
          />
        </Field>
      </div>
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
        {vatPercent > 0 && (
          <div className="flex items-baseline justify-between gap-3">
            <dt className="text-base text-muted-foreground">
              VAT ({vatPercent}%)
            </dt>
            <dd className="font-mono text-meta tabular-nums text-foreground">
              +{formatCurrency(calculatedVat, currency)}
            </dd>
          </div>
        )}
        <div className="flex items-baseline justify-between gap-3 border-t border-border pt-1.5">
          <dt className="text-base font-medium text-foreground">
            {vatPercent > 0 ? "Grand Total (incl. VAT)" : reduction > 0 ? "Client pays" : "Total"}
          </dt>
          <dd className="font-sans text-md font-medium tabular-nums text-foreground">
            {formatCurrency(finalTotalWithVat, currency)}
          </dd>
        </div>
      </dl>
    </div>
  );
}