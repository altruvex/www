import { cn } from "@/lib/utils/utils";
import { AlertCircle, Info, CheckCircle, AlertTriangle } from "lucide-react";

interface CalloutProps {
  type?: "info" | "warning" | "success" | "danger";
  children: React.ReactNode;
}

const icons = {
  info: Info,
  warning: AlertTriangle,
  success: CheckCircle,
  danger: AlertCircle,
};

const styles = {
  info: "bg-brand-soft border-brand/25 text-foreground",
  warning: "bg-warning/10 border-warning/30 text-foreground",
  success: "bg-success/10 border-success/30 text-foreground",
  danger: "bg-destructive/10 border-destructive/30 text-foreground",
};

const iconStyles = {
  info: "text-brand-text",
  warning: "text-warning",
  success: "text-success",
  danger: "text-destructive",
};

export function Callout({ type = "info", children }: CalloutProps) {
  const Icon = icons[type];

  return (
    <div className={cn("my-6 flex gap-3 rounded-lg border p-4", styles[type])}>
      <Icon className={cn("mt-0.5 h-5 w-5 shrink-0", iconStyles[type])} />
      <div className="flex-1 [&>p:last-child]:mb-0">{children}</div>
    </div>
  );
}
