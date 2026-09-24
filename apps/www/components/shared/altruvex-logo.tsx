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
    sm: "text-base",
    md: "text-lg",
    lg: "text-xl md:text-2xl",
  };

  const iconSizeClasses = {
    sm: "h-7 w-7 rounded-xl",
    md: "h-9 w-9 rounded-2xl",
    lg: "h-11 w-11 rounded-[1.25rem]",
  };

  if (variant === "icon") {
    return (
      <div
        className={cn(
          "flex items-center justify-center liquid-glass-flat transition-transform duration-(--motion-drawer) ease-default hover:scale-105 active:scale-95 shadow-sm",
          iconSizeClasses[size],
          className
        )}
      >
        <span
          className={cn(
            "font-sans font-bold tracking-tight text-foreground",
            size === "sm" && "text-xs",
            size === "md" && "text-sm",
            size === "lg" && "text-base"
          )}
        >
          A
        </span>
      </div>
    );
  }

  return (
    <div className={cn("flex items-center", className)}>
      <span
        className={cn(
          "font-sans font-semibold tracking-tight transition-opacity duration-(--motion-drawer) group-hover:opacity-80 text-foreground uppercase",
          sizeClasses[size]
        )}
      >
        Altruvex
      </span>
    </div>
  );
}