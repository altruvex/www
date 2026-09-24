import { Strong } from "@/components/ui/emphasis";
import { cn } from "@/lib/utils/utils";
import type { ReactNode } from "react";

const BODY = "text-[1.0625rem] leading-[1.75] text-muted-foreground";

function parseInline(text: string): ReactNode[] {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);

  return parts.map((part, index) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return <Strong key={index}>{part.slice(2, -2)}</Strong>;
    }

    return part;
  });
}

/** `**Label**: value` — a line that names a thing and then states it. */
const LABELLED_LINE = /^\*\*([^*]+)\*\*\s*[:：]\s*(.+)$/;

export function LegalList({ items, className }: { items: string[]; className?: string }) {
  return (
    <ul className={cn("mt-4 space-y-3", className)}>
      {items.map((item) => (
        <li
          key={item}
          className={cn(
            BODY,
            "relative ps-6 before:absolute before:inset-s-0 before:top-[0.85em] before:h-px before:w-3 before:bg-foreground/35",
          )}
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
    <dl className={cn("mt-6 border-t border-border-subtle", className)}>
      {details.map(({ label, value }) => (
        <div
          key={label}
          className="grid gap-1 border-b border-border-subtle py-4 sm:grid-cols-[minmax(9rem,12rem)_minmax(0,1fr)] sm:gap-6"
        >
          <dt className="text-[0.9375rem] font-medium leading-relaxed text-foreground">
            {label.replace(/[:：]\s*$/, "")}
          </dt>
          <dd className="text-[0.9375rem] leading-relaxed text-muted-foreground">
            {value}
          </dd>
        </div>
      ))}
    </dl>
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

        // Several `**Label**: value` lines in one block are a reference table
        // (the subprocessor register), not a paragraph — joined into one
        // paragraph they ran together into an unreadable line.
        const labelled = lines.map((line) => LABELLED_LINE.exec(line.trim()));
        if (lines.length > 1 && labelled.every(Boolean)) {
          return (
            <LegalDetails
              key={blockIndex}
              details={labelled.map((match) => ({
                label: match![1],
                value: match![2],
              }))}
            />
          );
        }

        return (
          <p key={blockIndex} className={BODY}>
            {parseInline(block)}
          </p>
        );
      })}
    </div>
  );
}
