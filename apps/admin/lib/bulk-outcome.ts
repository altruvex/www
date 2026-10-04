import { toast } from "sonner";

import type { ConfirmResult } from "@/components/os/confirm-dialog";

export interface RowRun {
  ok: boolean;
  message?: string;
  unchanged?: boolean;
}

export interface BulkOutcome {
  done: number;
  unchanged: number;
  refused: { label: string; reason: string }[];
}

export async function runPerRow<T>(
  rows: T[],
  label: (row: T) => string,
  run: (row: T) => Promise<RowRun>,
): Promise<BulkOutcome> {
  const outcome: BulkOutcome = { done: 0, unchanged: 0, refused: [] };
  for (const row of rows) {
    try {
      const result = await run(row);
      if (!result.ok) {
        outcome.refused.push({ label: label(row), reason: result.message ?? "Refused." });
      } else if (result.unchanged) {
        outcome.unchanged += 1;
      } else {
        outcome.done += 1;
      }
    } catch {
      outcome.refused.push({ label: label(row), reason: "Could not reach the server." });
    }
  }
  return outcome;
}

const SHOWN_REASONS = 5;

function reasons(refused: BulkOutcome["refused"]): string {
  const lines = refused.slice(0, SHOWN_REASONS).map((r) => `${r.label}: ${r.reason}`);
  if (refused.length > SHOWN_REASONS) lines.push(`and ${refused.length - SHOWN_REASONS} more`);
  return lines.join("\n");
}

export function reportOutcome(
  outcome: BulkOutcome,
  words: { done: (n: number) => string; unchanged?: (n: number) => string },
): ConfirmResult {
  const { done, unchanged, refused } = outcome;
  const parts: string[] = [];
  if (done > 0) parts.push(words.done(done));
  if (unchanged > 0 && words.unchanged) parts.push(words.unchanged(unchanged));
  if (refused.length > 0) parts.push(`${refused.length} refused`);
  const summary = parts.join(" · ") || "Nothing changed.";

  if (refused.length === 0) return { ok: true, message: summary };
  if (done === 0) return { ok: false, message: `${summary}. ${reasons(refused)}` };
  toast.warning(summary, { description: reasons(refused) });
  return undefined;
}
