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
  info: "bg-blue-50 border-blue-200 text-blue-900 dark:bg-blue-950 dark:border-blue-800 dark:text-blue-100",
  warning:
    "bg-yellow-50 border-yellow-200 text-yellow-900 dark:bg-yellow-950 dark:border-yellow-800 dark:text-yellow-100",
  success:
    "bg-green-50 border-green-200 text-green-900 dark:bg-green-950 dark:border-green-800 dark:text-green-100",
  danger:
    "bg-red-50 border-red-200 text-red-900 dark:bg-red-950 dark:border-red-800 dark:text-red-100",
};

export function Callout({ type = "info", children }: CalloutProps) {
  const Icon = icons[type];

  return (
    <div className={cn("my-6 flex gap-3 rounded-lg border p-4", styles[type])}>
      <Icon className="mt-0.5 h-5 w-5 shrink-0" />
      <div className="flex-1">{children}</div>
    </div>
  );
}
