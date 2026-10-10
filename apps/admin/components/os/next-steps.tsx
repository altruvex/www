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
        <div className="flex flex-col gap-1.5 border-b border-border-subtle p-3 [&>*]:w-full [&>*]:justify-start">
          {children}
        </div>
      )}
      <ul className="divide-y divide-border-subtle">
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

/** Reasons under an action: the first few shown, the rest behind "more". */
export function WhyList({
  why,
  label,
  visible = 3,
}: {
  why: string[];
  label: string;
  visible?: number;
}) {
  if (why.length === 0) return null;
  const shown = why.slice(0, visible);
  const rest = why.slice(visible);
  return (
    <div role="group" aria-label={label}>
      <ul className="space-y-0.5">
        {shown.map((reason) => (
          <li key={reason} className="text-meta text-muted-foreground">
            {reason}
          </li>
        ))}
      </ul>
      {rest.length > 0 && (
        <details className="mt-0.5">
          <summary className="cursor-pointer rounded-sm text-meta text-brand focus-visible:outline-2 focus-visible:outline-ring">
            {rest.length} more
          </summary>
          <ul className="mt-0.5 space-y-0.5">
            {rest.map((reason) => (
              <li key={reason} className="text-meta text-muted-foreground">
                {reason}
              </li>
            ))}
          </ul>
        </details>
      )}
    </div>
  );
}

/**
 * The one next action for a record: what to do, when, and why, with the
 * blockers in its way. `badges` carries the status chips, `action` the control
 * that does it, `children` anything the operator should know before acting.
 */
export function NextActionPanel({
  label,
  due,
  why,
  blockers = [],
  badges,
  action,
  children,
  visible = 3,
  className,
}: {
  label: React.ReactNode;
  due?: React.ReactNode;
  why: string[];
  blockers?: string[];
  badges?: React.ReactNode;
  action?: React.ReactNode;
  children?: React.ReactNode;
  visible?: number;
  className?: string;
}) {
  return (
    <Panel title="Next action" action={badges} className={className}>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 space-y-1.5">
          <p className="text-base font-medium">
            {label}
            {due && (
              <span className="ms-2 font-mono text-meta font-normal tabular-nums text-muted-foreground">
                {due}
              </span>
            )}
          </p>
          <WhyList label="Why this is next" why={why} visible={visible} />
        </div>
        {action && (
          <div className="flex shrink-0 flex-wrap gap-2">{action}</div>
        )}
      </div>
      {blockers.length > 0 && (
        <div className="mt-3 space-y-1 border-t border-border-subtle pt-3">
          <p className="telemetry text-subtle-foreground">Blockers</p>
          <WhyList label="Blockers" why={blockers} visible={visible} />
        </div>
      )}
      {children}
    </Panel>
  );
}
