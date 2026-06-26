import { ArrowLabel } from "@/components/shared/directional-link";
import { MagneticButton } from "@/components/magnetic-button";
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
  /** Variant for the primary button. Defaults to "primary"; use "accent" for threshold/conversion moments. */
  primaryVariant?: "primary" | "accent";
  /** Wraps the secondary label in an arrow too, matching sections where both CTAs carry a directional cue. */
  secondaryArrow?: boolean;
  className?: string;
  ref?: Ref<HTMLDivElement>;
};

export function CtaButtonGroup({
  primary,
  secondary,
  primaryVariant = "primary",
  secondaryArrow = false,
  className,
  ref,
}: CtaButtonGroupProps) {
  return (
    <div
      ref={ref}
      className={cn(
        "flex flex-col sm:flex-row sm:items-center gap-4",
        className,
      )}
    >
      <MagneticButton
        asChild
        size="lg"
        variant={primaryVariant}
        className="group w-full sm:w-auto"
      >
        <Link href={primary.href}>
          <ArrowLabel className="justify-center">{primary.label}</ArrowLabel>
        </Link>
      </MagneticButton>
      {secondary ? (
        <MagneticButton
          asChild
          size="lg"
          variant="secondary"
          className={cn("w-full sm:w-auto text-center", secondaryArrow && "group")}
        >
          <Link href={secondary.href}>
            {secondaryArrow ? (
              <ArrowLabel className="justify-center">{secondary.label}</ArrowLabel>
            ) : (
              secondary.label
            )}
          </Link>
        </MagneticButton>
      ) : null}
    </div>
  );
}
