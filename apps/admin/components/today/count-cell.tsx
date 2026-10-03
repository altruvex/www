import Link from "next/link";
import { cn } from "@/lib/utils";
import { toneText, type Tone } from "@/lib/status";

/**
 * A small labelled count inside a Today panel. Always a link: a number on Today
 * is a question ("which ones?"), and the answer is the filtered list behind it.
 * A zero is quiet whatever its tone, so an all-clear never reads as an alarm.
 */
export function CountCell({
  label,
  value,
  tone = "neutral",
  href,
  title,
}: {
  label: string;
  value: number;
  tone?: Tone;
  href: string;
  title?: string;
}) {
  return (
    <Link
      href={href}
      title={title}
      className="block rounded-md border border-border bg-surface/60 px-2.5 py-2 transition-colors duration-[var(--dur-state)] hover:border-border-mid hover:bg-surface"
    >
      <p className="telemetry text-subtle-foreground">{label}</p>
      <p
        className={cn(
          "mt-1 font-sans text-lg font-medium tabular-nums",
          value === 0 ? "text-muted-foreground" : toneText[tone],
        )}
      >
        {value}
      </p>
    </Link>
  );
}
