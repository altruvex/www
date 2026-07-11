import { cn } from "@/lib/utils/utils";

interface AltruvexLogoProps {
className?: string;
size?: "sm" | "md" | "lg";
variant?: "full" | "icon";
}

export function AltruvexLogo({
className,
size = "md",
variant = "full",
}: AltruvexLogoProps) {
const sizeClasses = {
  sm: "text-xl",
  md: "text-2xl",
  lg: "text-3xl md:text-4xl",
};

const iconSizeClasses = {
  sm: "h-7 w-7",
  md: "h-9 w-9",
  lg: "h-11 w-11",
};

if (variant === "icon") {
  return (
    <div
      className={cn(
        "flex items-center justify-center rounded-lg liquid-glass transition-all duration-200 hover:border-foreground/20 hover:bg-foreground/5",
        iconSizeClasses[size],
      )}
    >
      <span className={cn(
        "font-sans text-sm font-semibold tracking-[-0.04em] transition-colors duration-300",
        "text-primary",
      )}>
        A
      </span>
    </div>
  );
}

return (
  <div className={cn("flex items-center", className)}>
    <span
      className={cn(
        "font-sans font-semibold uppercase tracking-[-0.05em] transition-all duration-300 group-hover:opacity-75",
        sizeClasses[size],
        "text-primary",
      )}
    >
      Altruvex
    </span>
  </div>
);
}
