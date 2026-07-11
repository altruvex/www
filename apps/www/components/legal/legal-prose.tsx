import { Strong } from "@/components/ui/emphasis";
import { Eyebrow } from "@/components/ui/eyebrow";
import { cn } from "@/lib/utils/utils";
import type { ReactNode } from "react";

function parseInline(text: string): ReactNode[] {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);

  return parts.map((part, index) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return <Strong key={index}>{part.slice(2, -2)}</Strong>;
    }

    return part;
  });
}

export function LegalList({ items, className }: { items: string[]; className?: string }) {
  return (
    <ul className={cn("mt-4 space-y-2.5", className)}>
      {items.map((item) => (
        <li
          key={item}
          className="relative ps-5 text-base text-primary/60 leading-relaxed before:absolute before:inset-s-0 before:top-[0.55em] before:h-1 before:w-1 before:rounded-full before:bg-primary/25"
        >
          {parseInline(item)}
        </li>
      ))}
    </ul>
  );
}

export function LegalDetails({
  details,
  className,
}: {
  details: Array<{ label: string; value: string }>;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "mt-6 grid gap-4 border border-foreground/8 rounded-lg bg-foreground/2 p-5 md:p-6",
        className,
      )}
    >
      {details.map(({ label, value }) => (
        <div
          key={label}
          className="grid gap-1 border-b border-foreground/6 pb-4 last:border-b-0 last:pb-0 sm:grid-cols-[minmax(120px,160px)_1fr] sm:gap-4"
        >
          <Eyebrow tone="foreground" className="normal-case tracking-normal font-sans text-sm">
            {label}
          </Eyebrow>
          <p className="text-sm text-primary/60 leading-relaxed">{value}</p>
        </div>
      ))}
    </div>
  );
}

export function LegalProse({
  content,
  className,
}: {
  content: string;
  className?: string;
}) {
  const blocks = content.split("\n\n").filter(Boolean);

  return (
    <div className={cn("space-y-4", className)}>
      {blocks.map((block, blockIndex) => {
        const lines = block.split("\n").filter((line) => line.trim());
        const isList = lines.length > 0 && lines.every((line) => line.trim().startsWith("•"));

        if (isList) {
          return (
            <LegalList
              key={blockIndex}
              items={lines.map((line) => line.replace(/^•\s*/, ""))}
            />
          );
        }

        return (
          <p key={blockIndex} className="text-base text-primary/60 leading-relaxed">
            {parseInline(block)}
          </p>
        );
      })}
    </div>
  );
}
