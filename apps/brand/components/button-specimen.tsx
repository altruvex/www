import { cn } from "@/lib/cn";
import {
  magneticButtonRadii,
  magneticButtonSizes,
  magneticButtonVariants,
  type MagneticButtonSize,
  type MagneticButtonVariant,
} from "@repo/ui/www";

/* MagneticButton's own variant, size and radius classes from @repo/ui/www, without the magnet. */

export function ButtonSpecimen({
  variant = "primary",
  size = "default",
  children,
}: {
  variant?: MagneticButtonVariant;
  size?: MagneticButtonSize;
  children: React.ReactNode;
}): React.ReactElement {
  return (
    <button
      type="button"
      className={cn(
        "relative inline-flex items-center justify-center overflow-hidden font-medium",
        "transition-[background-color,border-color,color,opacity] duration-(--motion-drawer) ease-default",
        "outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-ring",
        magneticButtonVariants[variant],
        magneticButtonSizes[size],
        magneticButtonRadii[size],
      )}
    >
      {children}
    </button>
  );
}
