import { MagneticButton } from "@/components/magnetic-button";
import { ArrowLabel } from "@/components/shared/directional-link";
import { TrackedCtaLink } from "@/components/interactive/tracked-cta-link";
import { Link } from "@/i18n/navigation";
import {
  ctaContextQuery,
  ctaKeyForHref,
  type CommercialCtaKey,
  type CtaContext,
} from "@/lib/config/commercial";
import { cn } from "@/lib/utils/utils";
import type { ComponentProps, Ref } from "react";

type CtaAction = {
  href: string;
  label: string;
  /** The registry key, when the href alone does not name it (it carries a context). */
  cta?: CommercialCtaKey;
  context?: CtaContext;
};

/**
 * A registry CTA (named, or recognised by its plain href) is measured through
 * the tracked client leaf; any other link stays a plain Link. The rest props
 * are what MagneticButton's Slot merges in (class, ref, handlers).
 */
function ActionLink({
  action,
  ...props
}: Omit<ComponentProps<typeof Link>, "href"> & { action: CtaAction }) {
  const key = action.cta ?? ctaKeyForHref(action.href);
  if (!key) return <Link {...props} href={action.href} />;
  return (
    <TrackedCtaLink
      {...props}
      href={action.href}
      ctaKey={key}
      ctaContext={ctaContextQuery(action.context) || undefined}
    />
  );
}

type CtaButtonGroupProps = {
  primary: CtaAction;
  secondary?: CtaAction;
  primaryVariant?: "primary" | "accent";
  secondaryArrow?: boolean;
  /** "link" renders the secondary as an underline text link beside the one button. */
  secondaryAs?: "button" | "link";
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
  secondaryAs = "button",
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
        <ActionLink action={primary}>
          <ArrowLabel className="justify-center whitespace-nowrap">
            {primary.label}
          </ArrowLabel>
        </ActionLink>
      </MagneticButton>
      {secondary && secondaryAs === "link" && (
        <ActionLink
          action={secondary}
          className={cn(
            "group inline-flex min-h-6 items-center self-start rounded-ctl-sm text-base text-foreground underline decoration-border underline-offset-4 transition-colors duration-(--motion-drawer) ease-smooth outline-none hover:decoration-current focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background pointer-coarse:min-h-11",
            secondaryClassName,
          )}
        >
          <ArrowLabel>{secondary.label}</ArrowLabel>
        </ActionLink>
      )}
      {secondary && secondaryAs === "button" && (
        <MagneticButton
          asChild
          size="lg"
          variant="secondary"
          className={cn(width, radius, secondaryArrow && "group", secondaryClassName)}
        >
          <ActionLink action={secondary}>
            {secondaryArrow ? (
              <ArrowLabel className="justify-center whitespace-nowrap">
                {secondary.label}
              </ArrowLabel>
            ) : (
              <span className="whitespace-nowrap">{secondary.label}</span>
            )}
          </ActionLink>
        </MagneticButton>
      )}
    </div>
  );
}
