"use client";

import { SectionHeading } from "@/components/sections/section-heading";
import { Container } from "@/components/shared/container";
import { DirectionalLink } from "@/components/shared/directional-link";
import { ScopeBars } from "@/components/shared/process-parts";
import { getCommercialCta } from "@/lib/config/commercial";
import { useSectionCardGrid, useSectionTitle } from "@/lib/motion";
import { localizeNumbers } from "@/lib/utils/number";
import { MAX_DELIVERY_WEEKS } from "@repo/pricing-schema";
import { useLocale, useTranslations } from "next-intl";

export function ScopeSection() {
  const t = useTranslations("process");
  const tCTAs = useTranslations("commercial.ctas");
  const locale = useLocale();
  const titleRef = useSectionTitle();
  const barsRef = useSectionCardGrid<HTMLDivElement>({ selector: "[data-scope-bar]" });

  return (
    <section
      aria-labelledby="process-scope-heading"
      className="border-t border-border-subtle pt-(--section-y-top) pb-(--section-y-bottom)"
    >
      <Container>
        <SectionHeading
          titleId="process-scope-heading"
          titleRef={titleRef}
          firstTitle={t("page.scope.title")}
          secondTitle={t("page.scope.titleItalic")}
          classes={{ title: "max-w-[18ch]" }}
        />

        <ScopeBars barsRef={barsRef} className="mt-(--heading-gap)" />

        <p className="mt-12 max-w-[56ch] text-base leading-relaxed text-muted-foreground">
          {t("page.scope.note", {
            ceiling: localizeNumbers(String(MAX_DELIVERY_WEEKS), locale),
          })}
        </p>

        <p className="mt-4 max-w-[56ch] text-base leading-relaxed text-muted-foreground">
          {t("page.payments.text")}
        </p>
        <DirectionalLink
          href={getCommercialCta("paymentTerms").href}
          className="mt-4 inline-flex min-h-6 items-center text-sm text-foreground underline decoration-border underline-offset-4 transition-colors hover:text-local-accent-text hover:decoration-local-accent-text pointer-coarse:min-h-11"
        >
          {t("page.payments.terms")}
        </DirectionalLink>
        <DirectionalLink
          href={getCommercialCta("projectRange").href}
          className="mt-2 flex min-h-6 w-fit items-center text-sm text-foreground underline decoration-border underline-offset-4 transition-colors hover:text-local-accent-text hover:decoration-local-accent-text pointer-coarse:min-h-11"
        >
          {tCTAs("projectRange")}
        </DirectionalLink>
      </Container>
    </section>
  );
}
