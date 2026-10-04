import * as React from "react";
import Link from "next/link";
import { ArrowRight, type LucideIcon } from "lucide-react";
import { Panel } from "@/components/os/panel";
import { cn } from "@/lib/utils";

export type NextStep = {
  key: string;
  label: string;
  hint?: string;
  icon: LucideIcon;
  href: string;
  primary?: boolean;
};

export function NextSteps({
  steps,
  title = "Next steps",
  children,
  className,
}: {
  steps: NextStep[];
  title?: React.ReactNode;
  children?: React.ReactNode;
  className?: string;
}) {
  if (steps.length === 0 && !children) return null;
  return (
    <Panel title={title} flush className={className}>
      {children && (
        <div className="flex flex-col gap-1.5 border-b border-border p-3 [&>*]:w-full [&>*]:justify-start">
          {children}
        </div>
      )}
      <ul className="divide-y divide-border">
        {steps.map((step) => {
          const Icon = step.icon;
          return (
            <li key={step.key}>
              <Link
                href={step.href}
                className={cn(
                  "group flex items-center gap-2.5 px-3 py-2 outline-none transition-colors duration-[var(--dur-state)] hover:bg-muted/60 focus-visible:bg-muted/60",
                  step.primary && "bg-brand/[0.06]",
                )}
              >
                <Icon
                  className={cn(
                    "size-3.5 shrink-0",
                    step.primary ? "text-brand" : "text-subtle-foreground",
                  )}
                  aria-hidden
                />
                <span className="min-w-0 flex-1">
                  <span
                    className={cn(
                      "block truncate text-base",
                      step.primary && "font-medium",
                    )}
                  >
                    {step.label}
                  </span>
                  {step.hint && (
                    <span className="block truncate text-meta text-muted-foreground">
                      {step.hint}
                    </span>
                  )}
                </span>
                <ArrowRight
                  className="size-3 shrink-0 text-subtle-foreground transition-transform duration-[var(--dur-state)] group-hover:translate-x-0.5 rtl:rotate-180 rtl:group-hover:-translate-x-0.5"
                  aria-hidden
                />
              </Link>
            </li>
          );
        })}
      </ul>
    </Panel>
  );
}
