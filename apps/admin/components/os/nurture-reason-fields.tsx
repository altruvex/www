"use client";

import * as React from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@repo/ui";
import { DateField } from "@/components/os/date-field";
import { BUSINESS_TIME_ZONE } from "@/lib/payment-overdue";
import { NURTURE_REVIEW_DAYS, workingDayAfterKey } from "@/lib/working-days";
import { optionsOf } from "@/lib/status";

export interface NurtureInput {
  reason: string;
  /** "YYYY-MM-DD" in business time. */
  reviewAt: string;
}

const FIELD_LABEL = "block text-meta font-medium text-muted-foreground";
const REASON_LABEL = "Why park it?";
const DATE_LABEL = "Review this lead again on";

/** Today as "YYYY-MM-DD" in business time — the earliest review date the server accepts. */
function businessToday(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: BUSINESS_TIME_ZONE }).format(new Date());
}

/**
 * State for parking a lead in nurture (docs/sales-os.md R8): a reason and a
 * review date. The date starts on the first working day 90 days out, as the
 * call-outcome sheet does (shared rule: lib/working-days.ts).
 */
export function useNurtureInput() {
  const [value, setValue] = React.useState<NurtureInput>({ reason: "", reviewAt: "" });
  const reset = React.useCallback(
    () => setValue({ reason: "", reviewAt: workingDayAfterKey(businessToday(), NURTURE_REVIEW_DAYS) }),
    [],
  );
  const ready = value.reason !== "" && value.reviewAt !== "" && value.reviewAt >= businessToday();
  return { value, setValue, reset, ready };
}

/** The reason + review-date picker shown inside every "Move to nurture" dialog. */
export function NurtureReasonFields({
  value,
  onChange,
}: {
  value: NurtureInput;
  onChange: (next: NurtureInput) => void;
}) {
  return (
    <div className="space-y-3">
      <label className="block space-y-1.5">
        <span className={FIELD_LABEL}>{REASON_LABEL}</span>
        <Select value={value.reason} onValueChange={(reason) => onChange({ ...value, reason })}>
          <SelectTrigger className="w-full" aria-label={REASON_LABEL}>
            <SelectValue placeholder="Pick a reason" />
          </SelectTrigger>
          <SelectContent>
            {optionsOf("lostReason").map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </label>
      <div className="space-y-1.5">
        <span className={FIELD_LABEL}>{DATE_LABEL}</span>
        <DateField
          value={value.reviewAt}
          onChange={(reviewAt) => onChange({ ...value, reviewAt })}
          min={businessToday()}
          ariaLabel={DATE_LABEL}
        />
      </div>
    </div>
  );
}
