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
  /** Stack both buttons at equal, full width on every screen — for narrow columns. */
  stacked?: boolean;
  /** "pill" rounds both buttons fully, matching the header's own CTA. */
  shape?: "default" | "pill";
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
        /* The group fills its column on mobile even when the parent does not
           stretch it (the hero's parent is items-start), so the buttons'
           own w-full has something to fill. */
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
          className={cn(width, radius, secondaryArrow && "group")}
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
