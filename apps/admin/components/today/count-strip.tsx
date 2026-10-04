import Link from "next/link";
import { cn } from "@/lib/utils";
import { toneDot, toneText, type Tone } from "@/lib/status";

export interface CountStripCell {
  label: string;
  value: number;
  href: string;
  tone?: Tone;
  sub?: string;
}

export function CountStrip({ cells, label = "Queues" }: { cells: CountStripCell[]; label?: string }) {
  if (cells.length === 0) return null;
  return (
    <nav aria-label={label} className="plane overflow-hidden">
      <ul className="-me-px -mb-px grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-[repeat(auto-fill,minmax(9.5rem,1fr))]">
        {cells.map((cell) => {
          const tone = cell.value === 0 ? "neutral" : (cell.tone ?? "neutral");
          return (
            <li key={cell.label} className="min-w-0 border-e border-b border-border">
              <Link
                href={cell.href}
                className={cn(
                  "group flex h-full min-h-11 flex-col gap-1 px-3 py-2.5 no-underline",
                  "transition-colors duration-[var(--dur-state)] hover:bg-surface/70",
                  "outline-none focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-brand",
                )}
              >
                <span className="telemetry flex min-w-0 items-center gap-1.5 text-subtle-foreground">
                  {tone !== "neutral" && (
                    <span className={cn("size-1.5 shrink-0 rounded-full", toneDot[tone])} aria-hidden />
                  )}
                  <span className="truncate">{cell.label}</span>
                </span>
                <span
                  className={cn(
                    "font-sans text-xl font-medium leading-none tabular-nums",
                    cell.value === 0 ? "text-muted-foreground" : toneText[tone],
                  )}
                >
                  {cell.value}
                </span>
                {cell.sub && (
                  <span className="truncate text-meta text-muted-foreground" title={cell.sub}>
                    {cell.sub}
                  </span>
                )}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
