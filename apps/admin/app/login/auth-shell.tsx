import { AlertCircle, CheckCircle2, Info } from "lucide-react";
import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

export function AuthShell({
  label,
  icon,
  title,
  lead,
  children,
  footer,
}: {
  label: string;
  icon?: ReactNode;
  title: string;
  lead?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
}) {
  return (
    <main className="flex min-h-dvh items-center justify-center px-4 py-10">
      <div className="w-full max-w-95">
        <div className="mb-5 flex items-center gap-2">
          <span
            className="grid size-6 shrink-0 place-items-center rounded-md bg-foreground font-sans text-meta font-semibold text-background"
            aria-hidden
          >
            A
          </span>
          <span className="font-sans text-md font-semibold tracking-tight">Altruvex</span>
          <span className="telemetry ms-auto text-subtle-foreground">{label}</span>
        </div>
        <div className="plane p-5">
          <div className="flex items-center gap-2">
            {icon && <span className="text-muted-foreground [&_svg]:size-4">{icon}</span>}
            <h1 className="text-lg font-semibold">{title}</h1>
          </div>
          {lead && <p className="mt-1 text-base text-muted-foreground">{lead}</p>}
          <div className="mt-5">{children}</div>
        </div>
        {footer && <div className="mt-3 text-meta text-subtle-foreground">{footer}</div>}
      </div>
    </main>
  );
}

const NOTICE: Record<
  "danger" | "warning" | "success" | "info",
  { className: string; icon: ReactNode; role: "alert" | "status" }
> = {
  danger: {
    className: "border-danger/25 bg-danger/[0.07] text-danger",
    icon: <AlertCircle />,
    role: "alert",
  },
  warning: {
    className: "border-warning/25 bg-warning/[0.07] text-warning",
    icon: <AlertCircle />,
    role: "alert",
  },
  success: {
    className: "border-success/25 bg-success/[0.07] text-success",
    icon: <CheckCircle2 />,
    role: "status",
  },
  info: {
    className: "border-border bg-surface text-muted-foreground",
    icon: <Info />,
    role: "status",
  },
};

export function AuthNotice({
  tone,
  children,
  className,
}: {
  tone: keyof typeof NOTICE;
  children: ReactNode;
  className?: string;
}) {
  const def = NOTICE[tone];
  return (
    <p
      role={def.role}
      className={cn(
        "flex items-start gap-2 rounded-md border px-2.5 py-2 text-base",
        def.className,
        className,
      )}
    >
      <span className="mt-0.5 shrink-0 [&_svg]:size-4" aria-hidden>
        {def.icon}
      </span>
      <span>{children}</span>
    </p>
  );
}

export const authControl = "h-[var(--control-h-lg)] pointer-coarse:min-h-11";
