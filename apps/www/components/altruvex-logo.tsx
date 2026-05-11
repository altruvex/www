import { cn } from "@/lib/utils";

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
          "flex items-center justify-center rounded-md border border-foreground/10 bg-background/80 shadow-sm backdrop-blur-sm transition-all duration-200 hover:border-foreground/20 hover:bg-foreground/5",
          iconSizeClasses[size],
        )}
      >
        <span className="font-sans text-sm font-semibold tracking-[-0.04em] text-primary">
          A
        </span>
      </div>
    );
  }

  return (
    <div className={cn("flex items-center", className)}>
      <span
        className={cn(
          "font-sans font-semibold uppercase tracking-[-0.05em] text-primary transition-opacity duration-200 group-hover:opacity-75",
          sizeClasses[size],
        )}
      >
        Altruvex
      </span>
    </div>
  );
}
