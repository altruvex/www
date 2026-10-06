"use client";

import { Container } from "@/components/shared/container";
import { Eyebrow } from "@repo/ui/www";
import { Num } from "@/components/ui/num";
import {
  useSectionDescription,
  useSectionEyebrow,
  useSectionTitle,
} from "@/lib/motion";
import { cn } from "@/lib/utils/utils";
import { useTranslations } from "next-intl";
import { SectionHeading } from "./section-heading";

const SHEETS = [
  { id: "interface", inverted: false, tint: null, z: "z-50" },
  { id: "components", inverted: false, tint: "bg-brand/5", z: "z-40" },
  { id: "application", inverted: false, tint: "bg-brand/10", z: "z-30" },
  { id: "data", inverted: true, tint: "bg-brand/15", z: "z-20" },
  { id: "infrastructure", inverted: true, tint: "bg-brand/25", z: "z-10" },
] as const;

export function OwnershipStackSection() {
  const t = useTranslations("ownershipStack");

  const eyebrowRef = useSectionEyebrow<HTMLParagraphElement>();
  const titleRef = useSectionTitle<HTMLHeadingElement>();
  const descRef = useSectionDescription();

  return (
    <section
      id="ownership-stack"
      aria-labelledby="ownership-stack-heading"
      className="accent-world-blue border-t border-border-subtle pt-(--section-y-top) pb-(--section-y-bottom)"
    >
      <Container>
        <SectionHeading
          titleId="ownership-stack-heading"
          eyebrowRef={eyebrowRef}
          titleRef={titleRef}
          descriptionRef={descRef}
          eyebrow={t("eyebrow")}
          firstTitle={t("title")}
          secondTitle={t("titleAccent")}
          description={t("subtitle")}
          className="mb-(--heading-gap)"
        />
        <ol className="isolate list-none space-y-3 [--sheet-h:clamp(26rem,58vh,35rem)] [--sheet-top:16vh] lg:motion-safe:space-y-0">
          {SHEETS.map(({ id, inverted, tint, z }, i) => (
            <li
              key={id}
              data-scene={inverted ? "inverted" : undefined}
              data-scene-lock={inverted ? "dark" : undefined}
              className={cn(
                "relative rounded-panel-lg border border-border-subtle text-foreground",
                !inverted && "bg-background",
                // The inverted scene keeps the section's on-light accent text; use the on-dark one on dark sheets (AA).
                inverted && "[--local-accent-text:hsl(var(--brand-text-on-dark))]",
                "lg:motion-safe:sticky lg:motion-safe:bottom-[calc(100vh-var(--sheet-top)-var(--sheet-h))] lg:motion-safe:h-(--sheet-h)",
                z,
              )}
            >
              {tint && (
                <span
                  aria-hidden
                  className={cn(
                    "pointer-events-none absolute inset-0 rounded-[inherit]",
                    tint,
                  )}
                />
              )}
              <div className="relative grid h-full content-between gap-x-14 gap-y-8 p-6 sm:p-9 lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)] lg:p-12">
                <div className="flex items-baseline justify-between gap-4 lg:col-span-2">
                  <span
                    aria-hidden
                    className="shrink-0 whitespace-nowrap text-sm tabular-nums text-muted-foreground ltr:font-mono"
                  >
                    <Num value={i + 1} pad={2} /> /{" "}
                    <Num value={SHEETS.length} pad={2} />
                  </span>
                </div>
                <h3 className="self-end font-sans text-[clamp(2.75rem,8vw,8rem)] font-light leading-none tracking-[-0.035em] rtl:text-[clamp(2.5rem,7vw,6.75rem)] rtl:leading-tight rtl:tracking-normal">
                  {t(`layers.${id}.name`)}
                </h3>
                <div className="self-end">
                  <p className="max-w-[44ch] leading-relaxed text-muted-foreground">
                    {t(`layers.${id}.detail`)}
                  </p>
                  <div className="mt-5 border-t border-foreground/45 pt-3.5">
                    <Eyebrow tone="accent">{t("ownershipLabel")}</Eyebrow>
                    <p className="mt-1.5 max-w-[40ch] text-body leading-relaxed">
                      {t(`layers.${id}.ownership`)}
                    </p>
                  </div>
                </div>
                {i === 0 && (
                  <div className="flex flex-wrap justify-between gap-x-4 gap-y-1 border-t-2 border-dashed border-brand pt-2.5 lg:col-span-2">
                    <Eyebrow tone="accent">{t("templateStops")}</Eyebrow>
                    <Eyebrow tone="accent">
                      <span aria-hidden>↓ </span>
                      {t("allLayers")}
                    </Eyebrow>
                  </div>
                )}
              </div>
            </li>
          ))}
        </ol>
      </Container>
    </section>
  );
}
