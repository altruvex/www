"use client";

import { Button } from "@repo/ui";

const DAY_MS = 86_400_000;

export function addDays(day: string, offset: number): string {
  const [y, m, d] = day.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d) + offset * DAY_MS)
    .toISOString()
    .slice(0, 10);
}

export function DatePresetChips({
  today,
  value,
  offsets,
  onPick,
  label = "Presets",
}: {
  today: string;
  value: string;
  offsets: readonly number[];
  onPick: (day: string, offset: number) => void;
  label?: string;
}) {
  return (
    <div role="group" aria-label={label} className="flex flex-wrap gap-1.5">
      {offsets.map((offset) => {
        const day = addDays(today, offset);
        const active = value === day;
        return (
          <Button
            key={offset}
            type="button"
            size="sm"
            variant={active ? "secondary" : "ghost"}
            aria-pressed={active}
            onClick={() => onPick(day, offset)}
            className="text-meta"
          >
            {offset === 0 ? "Today" : `+${offset} days`}
          </Button>
        );
      })}
    </div>
  );
}
