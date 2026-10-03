"use client";

import { SectionHeading } from "@/components/sections/section-heading";
import { Container } from "@/components/shared/container";
import { ScopeBars } from "@/components/shared/process-parts";
import { useSectionCardGrid, useSectionTitle } from "@/lib/motion";
import { localizeNumbers } from "@/lib/utils/number";
import { MAX_DELIVERY_WEEKS } from "@repo/pricing-schema";
import { useLocale, useTranslations } from "next-intl";

/**
 * CLAIM: scope changes how long a phase runs - never which phases run, their
 * order, or the sign-off between them.
 * PROOF: comparison - the same five phases at the smallest and the largest
 * scope, on one working-day scale. Both ends are the price matrix's delivery
 * window, so the bars never promise a length a price cell does not.
 * DEVICE: two static bars, one above the other. Nothing to toggle: the claim
 * is made by both ends being on screen at once.
 */
export function ScopeSection() {
  const t = useTranslations("process");
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

        <ScopeBars barsRef={barsRef} className="mt-14 lg:mt-20" />

        <p className="mt-12 max-w-[56ch] text-[0.9375rem] leading-relaxed text-muted-foreground">
          {t("page.scope.note", {
            ceiling: localizeNumbers(String(MAX_DELIVERY_WEEKS), locale),
          })}
        </p>
      </Container>
    </section>
  );
}
