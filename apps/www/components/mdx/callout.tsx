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
  info: "border-brand text-foreground",
  warning: "border-warning text-foreground",
  success: "border-success text-foreground",
  danger: "border-destructive text-foreground",
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
    <div className={cn("my-6 flex gap-3 border-s-2 ps-4", styles[type])}>
      <Icon className={cn("mt-0.5 h-5 w-5 shrink-0", iconStyles[type])} />
      <div className="flex-1 [&>p:last-child]:mb-0">{children}</div>
    </div>
  );
}
