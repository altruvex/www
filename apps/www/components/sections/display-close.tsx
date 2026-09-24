"use client";

import { CtaButtonGroup } from "@/components/interactive/cta-button-group";
import { Container } from "@/components/shared/container";
import { Highlight } from "@/components/ui/emphasis";
import { Eyebrow } from "@/components/ui/eyebrow";
import { getCommercialCta, type CommercialCtaKey } from "@/lib/config/commercial";
import { useSectionTitle } from "@/lib/motion";
import { useTranslations } from "next-intl";
import type { ReactNode } from "react";

/*
 * The display close — one line at display scale, the promise and the doors on
 * a single row under it. Chosen by Ali from the /services/development studio
 * prototype (2026-09-19), then shared so every service page that closes this
 * way closes identically.
 *
 * An inverted-scene island locked dark in BOTH themes (data-scene-lock="dark");
 * the header flips over it in the light theme via data-nav-invert. House
 * pieces: the accent eyebrow opened by the world tick, the serif-italic clause
 * in the page's world gradient (the page's accentWorldClass wrapper decides the
 * hue), a role-B hairline, the magnetic CTAs, and the shared reply-time footnote.
 */
export function DisplayClose({
  id,
  eyebrow,
  title,
  titleAccent,
  description,
  primary,
  secondary,
}: {
  id: string;
  eyebrow: ReactNode;
  title: ReactNode;
  titleAccent: ReactNode;
  description: ReactNode;
  primary: CommercialCtaKey;
  secondary: CommercialCtaKey;
}) {
  const tEnd = useTranslations("common.endCta");
  const tCTAs = useTranslations("commercial.ctas");
  const titleRef = useSectionTitle<HTMLHeadingElement>();

  return (
    <section
      aria-labelledby={id}
      data-scene="inverted"
      data-scene-lock="dark"
      data-nav-invert
      className="pt-[clamp(8rem,20vh,13rem)] pb-[clamp(5rem,12vh,8rem)]"
    >
      <Container>
        <div className="flex items-center gap-3">
          <span aria-hidden className="block h-[3px] w-5 rounded-full bg-local-accent" />
          <Eyebrow tone="accent">{eyebrow}</Eyebrow>
        </div>
        <h2
          ref={titleRef}
          id={id}
          className="mt-8 max-w-[13ch] text-[clamp(3.5rem,9.2vw,10rem)] leading-[0.98] font-normal tracking-[-0.045em] text-foreground rtl:max-w-[16ch] rtl:leading-[1.3] rtl:tracking-normal"
        >
          {title} <Highlight tone="world">{titleAccent}</Highlight>
        </h2>

        {/* The row splits at xl, not md. The CTA group is a ~560px row of two
            pills, so below 1280 a flex sibling beside it has no usable measure:
            the promise was rendering two or three words per line on every page
            that closes this way. Stacked, it keeps its 44ch. */}
        <div className="mt-16 flex flex-col justify-between gap-10 border-t border-border-subtle pt-8 lg:mt-24 xl:flex-row xl:items-end">
          <div className="min-w-0 max-w-[44ch] xl:flex-1">
            <p className="text-[clamp(1.0625rem,1.2vw,1.25rem)] leading-relaxed text-muted-foreground">{description}</p>
            <Eyebrow className="mt-5 text-xs">{tEnd("footnote")}</Eyebrow>
          </div>
          <CtaButtonGroup
            className="xl:shrink-0"
            primaryVariant="accent"
            primary={{ href: getCommercialCta(primary).href, label: tCTAs(primary) }}
            secondary={{ href: getCommercialCta(secondary).href, label: tCTAs(secondary) }}
            secondaryArrow
          />
        </div>
      </Container>
    </section>
  );
}
