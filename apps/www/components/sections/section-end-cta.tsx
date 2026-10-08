"use client";

import { Container } from "@/components/shared/container";
import { CtaButtonGroup } from "@/components/interactive/cta-button-group";
import { accentWorldClass, type AccentPalette } from "@/lib/config/accent-world";
import {
  getCommercialCta,
  type CommercialCtaKey,
  type CtaContext,
} from "@/lib/config/commercial";
import { useSectionDescription, useSectionElement, useSectionEyebrow, useSectionTitle } from "@/lib/motion";
import { cn } from "@/lib/utils/utils";
import { useTranslations } from "next-intl";
import type { ReactNode } from "react";
import { SectionHeading } from "./section-heading";

// A registry key, or an explicit link; an explicit link that names its `cta`
// (and the `context` it carries) is measured like a key.
type EndCtaAction =
  | CommercialCtaKey
  | { href: string; label: string; cta?: CommercialCtaKey; context?: CtaContext };

type SectionEndCtaProps = {
  eyebrow?: ReactNode;
  title: ReactNode;
  titleAccent?: ReactNode;
  body: ReactNode;
  primary: EndCtaAction;
  secondary?: EndCtaAction;
  world?: AccentPalette;
  aside?: ReactNode;
  size?: "default" | "display";
  titleClassName?: string;
  id?: string;
  ariaLabel?: string;
};

export function SectionEndCta({
  eyebrow,
  title,
  titleAccent,
  body,
  primary,
  secondary,
  world = "orange",
  aside,
  size = "default",
  titleClassName,
  id,
  ariaLabel,
}: SectionEndCtaProps) {
  const t = useTranslations("common.endCta");
  const tCTAs = useTranslations("commercial.ctas");
  const tAlternative = useTranslations("commercial.ctasAlternative");

  const eyebrowRef = useSectionEyebrow();
  const titleRef = useSectionTitle();
  const asideRef = useSectionElement<HTMLDivElement>();
  const contentRef = useSectionDescription<HTMLDivElement>();

  const resolve = (action: EndCtaAction) =>
    typeof action === "string"
      ? { href: getCommercialCta(action).href, label: tCTAs(action), cta: action }
      : action;
  // The second route reads as an alternative ("or estimate it first") when
  // its key has one; otherwise it keeps the registry label.
  const resolveSecondary = (action: EndCtaAction) =>
    typeof action === "string" && tAlternative.has(action)
      ? { ...resolve(action), label: tAlternative(action) }
      : resolve(action);

  return (
    <section
      id={id}
      aria-label={ariaLabel ?? t("eyebrow")}
      className={cn(
        "relative pt-(--section-y-top) pb-(--section-y-bottom)",
        accentWorldClass(world),
      )}
    >
      <Container>
        <div className="grid gap-10 md:grid-cols-[minmax(0,1fr)_clamp(18rem,28vw,24rem)] md:items-start lg:gap-16">
          <div className="min-w-0">
            <SectionHeading
              eyebrowRef={eyebrowRef}
              titleRef={titleRef}
              eyebrow={eyebrow ?? t("eyebrow")}
              firstTitle={title}
              secondTitle={titleAccent}
              accent="world"
              secondTitleBreak={false}
              className="block min-w-0"
              classes={{
                titleWrapper: "space-y-0",
                eyebrow: "text-muted-foreground mb-6 block",
                title: cn(
                  "max-w-4xl font-normal text-foreground tracking-[-0.02em] rtl:tracking-normal",
                  size === "display"
                    ? "text-[clamp(2.125rem,4vw,3.25rem)] leading-[1.08]"
                    : "text-[clamp(1.875rem,3.2vw,2.625rem)] leading-[1.1]",
                  titleClassName,
                ),
              }}
            />
            {aside && (
              <div ref={asideRef} className="mt-10 md:mt-12">
                {aside}
              </div>
            )}
          </div>
          <div ref={contentRef} className="flex min-w-0 flex-col gap-6">
            <p className="text-[clamp(1.0625rem,1.05vw,1.125rem)] leading-[1.75] text-muted-foreground">
              {body}
            </p>
            <CtaButtonGroup
              primaryVariant="accent"
              primary={resolve(primary)}
              secondary={secondary ? resolveSecondary(secondary) : undefined}
              secondaryAs="link"
              stacked
            />
          </div>
        </div>
      </Container>
    </section>
  );
}
