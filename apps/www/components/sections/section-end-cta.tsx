"use client";

import { Container } from "@/components/shared/container";
import { CtaButtonGroup } from "@/components/interactive/cta-button-group";
import { Eyebrow } from "@/components/ui/eyebrow";
import { accentWorldClass, type AccentPalette } from "@/lib/config/accent-world";
import { getCommercialCta, type CommercialCtaKey } from "@/lib/config/commercial";
import { useSectionDescription, useSectionElement, useSectionEyebrow, useSectionTitle } from "@/lib/motion";
import { cn } from "@/lib/utils/utils";
import { useTranslations } from "next-intl";
import type { ReactNode } from "react";
import { SectionHeading } from "./section-heading";

/** A shared commercial action by key, or a page's own link and wording. */
type EndCtaAction = CommercialCtaKey | { href: string; label: string };

type SectionEndCtaProps = {
  eyebrow?: ReactNode;
  title: ReactNode;
  titleAccent?: ReactNode;
  body: ReactNode;
  /** Defaults to the reply-time promise; pass null to omit it. */
  footnote?: ReactNode | null;
  primary: EndCtaAction;
  secondary?: EndCtaAction;
  world?: AccentPalette;
  /**
   * The page's own device, set under the heading: the next unwritten record on
   * /work, the next case study, the phase a project starts at. It is what makes
   * one page's close different from another's without a second layout.
   */
  aside?: ReactNode;
  /** "display" is the homepage's larger close. */
  size?: "default" | "display";
  id?: string;
  ariaLabel?: string;
};

/**
 * Every page closes on this one structure - heading on the reading side, the
 * next step in a narrow column beside it - so a visitor learns where the action
 * sits once. What changes per page is what the close says, which actions it
 * offers, the colour world it wears and the aside it carries. It used to close
 * eight pages on the same "Ready to scope your build?" with only the buttons
 * swapped, including the privacy policy.
 */
export function SectionEndCta({
  eyebrow,
  title,
  titleAccent,
  body,
  footnote,
  primary,
  secondary,
  world = "orange",
  aside,
  size = "default",
  id,
  ariaLabel,
}: SectionEndCtaProps) {
  const t = useTranslations("common.endCta");
  const tCTAs = useTranslations("commercial.ctas");

  const eyebrowRef = useSectionEyebrow();
  const titleRef = useSectionTitle();
  const asideRef = useSectionElement<HTMLDivElement>();
  const contentRef = useSectionDescription<HTMLDivElement>();

  const resolve = (action: EndCtaAction) =>
    typeof action === "string"
      ? { href: getCommercialCta(action).href, label: tCTAs(action) }
      : action;

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
        <div aria-hidden className="mb-14 h-px w-full bg-local-accent/40 md:mb-16" />
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
              secondary={secondary ? resolve(secondary) : undefined}
              secondaryArrow
              stacked
            />
            {footnote !== null && (
              <Eyebrow className="text-xs">{footnote ?? t("footnote")}</Eyebrow>
            )}
          </div>
        </div>
      </Container>
    </section>
  );
}
