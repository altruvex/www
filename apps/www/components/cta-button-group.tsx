import { ArrowLabel } from "@/components/directional-link";
import { MagneticButton } from "@/components/magnetic-button";
import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/utils";
import type { Ref } from "react";

type CtaAction = {
  href: string;
  label: string;
};

type CtaButtonGroupProps = {
  primary: CtaAction;
  secondary?: CtaAction;
  className?: string;
  ref?: Ref<HTMLDivElement>;
};

export function CtaButtonGroup({
  primary,
  secondary,
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
        variant="primary"
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
          className="w-full sm:w-auto text-center"
        >
          <Link href={secondary.href}>{secondary.label}</Link>
        </MagneticButton>
      ) : null}
    </div>
  );
}
