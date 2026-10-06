"use client";

import * as React from "react";

import { ComboboxSelect } from "@/components/os/combobox-select";
import { getIntentAccent, matchIntentAccent } from "@/lib/intent-accent";

const INDUSTRIES = [
  "Technology / SaaS",
  "Data / Analytics",
  "Cloud / Infrastructure",
  "Legal",
  "Finance / Banking",
  "Audit / Corporate",
  "Architecture",
  "Real estate",
  "Construction",
  "Hospitality / Hotels",
  "Food / Restaurants",
  "Retail",
  "Healthcare / Medical",
  "Wellness",
  "Education",
  "E-commerce",
  "Manufacturing",
  "Logistics / Supply chain",
  "Electric / Energy",
  "Solar",
  "Telecom",
  "Gaming",
  "Automotive",
  "Fintech",
  "Travel",
  "Media",
  "Nonprofit",
  "Agriculture",
  "Cybersecurity",
  "Biotech",
  "Pharma",
  "Insurance",
  "Sports",
  "Aerospace",
  "Government",
  "Fashion",
  "Marketing",
  "Consulting",
  "Hardware",
  "Mining",
  "Luxury / Premium",
];

export function IndustrySelect({
  name,
  defaultValue = "",
}: {
  name: string;
  defaultValue?: string;
}) {
  const [industry, setIndustry] = React.useState(defaultValue);
  const matched = matchIntentAccent(industry);
  const accent = matched ? getIntentAccent(matched) : null;

  return (
    <div className="space-y-2">
      <ComboboxSelect
        name={name}
        options={INDUSTRIES}
        defaultValue={defaultValue}
        searchPlaceholder="Search or type your own"
        emptyLabel="Type to use your own."
        allowCustom
        onChange={setIndustry}
      />
      {industry && (
        <p className="flex items-center gap-2 text-xs text-muted-foreground" aria-live="polite">
          {accent ? (
            <>
              <span
                aria-hidden
                className="inline-block h-3 w-3 shrink-0 rounded-full border border-border-subtle"
                style={{ backgroundColor: `#${accent.dark}` }}
              />
              Suggested accent: {accent.label}
            </>
          ) : (
            "No close match, so proposals start with the default Ocean accent. You can change it per proposal."
          )}
        </p>
      )}
    </div>
  );
}
