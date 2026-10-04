"use client";

import { SectionHeading } from "@/components/sections/section-heading";
import { Container } from "@/components/shared/container";
import { ScopeBars } from "@/components/shared/process-parts";
import { useSectionCardGrid, useSectionTitle } from "@/lib/motion";
import { localizeNumbers } from "@/lib/utils/number";
import { MAX_DELIVERY_WEEKS } from "@repo/pricing-schema";
import { useLocale, useTranslations } from "next-intl";

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

        <ScopeBars barsRef={barsRef} className="mt-(--heading-gap)" />

        <p className="mt-12 max-w-[56ch] text-[0.9375rem] leading-relaxed text-muted-foreground">
          {t("page.scope.note", {
            ceiling: localizeNumbers(String(MAX_DELIVERY_WEEKS), locale),
          })}
        </p>
      </Container>
    </section>
  );
}
