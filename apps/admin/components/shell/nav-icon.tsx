import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export function NavIcon({
  icon: Icon,
  active,
  size = 16,
  className,
}: {
  icon: LucideIcon;
  active?: boolean;
  size?: number;
  className?: string;
}) {
  return (
    <Icon
      size={size}
      strokeWidth={active ? 2 : 1.75}
      className={cn("shrink-0", className)}
      aria-hidden
    />
  );
}
