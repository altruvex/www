"use client";

import * as React from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Textarea,
} from "@repo/ui";
import { optionsOf } from "@/lib/status";

export interface LostInput {
  reason: string;
  note: string;
}

const FIELD_LABEL = "block text-meta font-medium text-muted-foreground";

/** State for the reason a lead was lost; `ready` once a reason is picked. */
export function useLostInput() {
  const [value, setValue] = React.useState<LostInput>({ reason: "", note: "" });
  const reset = React.useCallback(() => setValue({ reason: "", note: "" }), []);
  return { value, setValue, reset, ready: value.reason !== "" };
}

/** The reason picker shown inside every "Mark lost" dialog. */
export function LostReasonFields({
  value,
  onChange,
}: {
  value: LostInput;
  onChange: (next: LostInput) => void;
}) {
  return (
    <div className="space-y-3">
      <label className="block space-y-1.5">
        <span className={FIELD_LABEL}>Why was it lost?</span>
        <Select
          value={value.reason}
          onValueChange={(reason) => onChange({ ...value, reason })}
        >
          <SelectTrigger className="w-full">
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
      <label className="block space-y-1.5">
        <span className={FIELD_LABEL}>Note (optional)</span>
        <Textarea
          value={value.note}
          maxLength={1000}
          rows={2}
          onChange={(event) => onChange({ ...value, note: event.target.value })}
          placeholder="What would have changed the answer"
        />
      </label>
    </div>
  );
}
