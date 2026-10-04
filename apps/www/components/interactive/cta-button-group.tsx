import { MagneticButton } from "@/components/magnetic-button";
import { ArrowLabel } from "@/components/shared/directional-link";
import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/utils/utils";
import type { Ref } from "react";

type CtaAction = {
  href: string;
  label: string;
};

type CtaButtonGroupProps = {
  primary: CtaAction;
  secondary?: CtaAction;
  primaryVariant?: "primary" | "accent";
  secondaryArrow?: boolean;
  stacked?: boolean;
  shape?: "default" | "pill";
  secondaryClassName?: string;
  className?: string;
  ref?: Ref<HTMLDivElement>;
};

export function CtaButtonGroup({
  primary,
  secondary,
  primaryVariant = "primary",
  secondaryArrow = false,
  stacked = false,
  shape = "default",
  secondaryClassName,
  className,
  ref,
}: CtaButtonGroupProps) {
  const width = stacked ? "w-full" : "w-full sm:w-auto";
  const radius = shape === "pill" ? "rounded-full" : "";

  return (
    <div
      ref={ref}
      className={cn(
        "flex flex-col items-stretch gap-3",
        width,
        !stacked && "sm:flex-row sm:items-center",
        className,
      )}
    >
      <MagneticButton
        asChild
        size="lg"
        variant={primaryVariant}
        className={cn("group", width, radius)}
      >
        <Link href={primary.href}>
          <ArrowLabel className="justify-center whitespace-nowrap">
            {primary.label}
          </ArrowLabel>
        </Link>
      </MagneticButton>
      {secondary && (
        <MagneticButton
          asChild
          size="lg"
          variant="secondary"
          className={cn(width, radius, secondaryArrow && "group", secondaryClassName)}
        >
          <Link href={secondary.href}>
            {secondaryArrow ? (
              <ArrowLabel className="justify-center whitespace-nowrap">
                {secondary.label}
              </ArrowLabel>
            ) : (
              <span className="whitespace-nowrap">{secondary.label}</span>
            )}
          </Link>
        </MagneticButton>
      )}
    </div>
  );
}
