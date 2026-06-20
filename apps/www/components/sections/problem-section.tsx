"use client";
import { Container } from "@/components/container";
import { Accent } from "@/components/ui/emphasis";
import { Eyebrow } from "@/components/ui/eyebrow";
import { getCommercialCta } from "@/lib/commercial";
import { useSectionCardGrid, useSectionDescription, useSectionEyebrow, useSectionTitle } from "@/lib/motion";
import { useTranslations } from "next-intl";
import { memo } from "react";

const PAINS = [
  {
    number: "01",
    titleKey: "problem.issues.templates.title",
    bodyKey: "problem.issues.templates.description",
  },
  {
    number: "02",
    titleKey: "problem.issues.speed.title",
    bodyKey: "problem.issues.speed.description",
  },
  {
    number: "03",
    titleKey: "problem.issues.confusion.title",
    bodyKey: "problem.issues.confusion.description",
  },
  {
    number: "04",
    titleKey: "problem.issues.amateurs.title",
    bodyKey: "problem.issues.amateurs.description",
  },
];

export const ProblemSection = memo(function ProblemSection() {
  const t = useTranslations();
  const tCommon = useTranslations("common");
  const tCTAs = useTranslations("commercial.ctas");
  const stepLabel = tCommon("step");
  const auditCta = getCommercialCta("technicalAudit");

  const eyebrowRef = useSectionEyebrow();
  const titleRef = useSectionTitle<HTMLHeadingElement>();
  const descRef = useSectionDescription();
  const gridRef = useSectionCardGrid<HTMLUListElement>({ selector: "[data-pain]", stagger: 0.06 });

  return (
    <section
      id="problem"
      aria-labelledby="problem-heading"
      className="relative border-y border-border bg-background pt-(--section-y-top) pb-(--section-y-bottom)"
    >
      <Container>
        <div className="mb-12 max-w-3xl space-y-4 md:mb-16">
          <Eyebrow ref={eyebrowRef}>{t("problem.badge")}</Eyebrow>
          <h2
            id="problem-heading"
            ref={titleRef}
            className="section-title font-normal text-foreground"
          >
            {t("problem.title.pre")}{" "}
            <span className="text-muted-foreground line-through decoration-foreground/25 decoration-2">
              {t("problem.title.crossed")}
            </span>
            <br />
            <Accent gradient="ember">{t("problem.title.gradient")}</Accent>
          </h2>
          <p
            ref={descRef}
            className="max-w-2xl text-[clamp(1.0625rem,1.05vw,1.125rem)] leading-[1.75] text-muted-foreground"
          >
            {t("problem.subtitle")}
          </p>
        </div>
        <ul
          ref={gridRef}
          role="list"
          className="accent-world-orange grid grid-cols-1 border-t border-border md:grid-cols-2"
        >
          {PAINS.map((pain, i) => (
            <li
              key={pain.number}
              data-pain
              className={`group relative overflow-hidden border-b border-border px-6 py-10 md:px-10 md:py-14 ${
                i % 2 === 0 ? "md:border-e" : ""
              }`}
            >
              <span
                aria-hidden
                className="absolute inset-x-0 top-0 h-px origin-left scale-x-0 bg-local-accent/60 transition-transform duration-500 ease-out group-hover:scale-x-100 rtl:origin-right"
              />
              <span
                aria-hidden
                className="pointer-events-none absolute inset-0 bg-linear-to-br from-local-accent-soft to-transparent opacity-0 transition-opacity duration-500 group-hover:opacity-100 rtl:bg-linear-to-bl"
              />
              <div className="relative z-10 flex items-start gap-5 md:gap-7">
                <span
                  aria-hidden
                  className="shrink-0 font-mono text-[2.75rem] font-extralight leading-none tabular-nums text-foreground/10 transition-colors duration-500 group-hover:text-local-accent/45 md:text-[3.25rem]"
                >
                  {pain.number}
                </span>

                <div className="space-y-3 pt-1">
                  <p className="font-mono text-[13px] uppercase tracking-[0.18em] text-muted-foreground rtl:tracking-normal">
                    {stepLabel} {pain.number}
                  </p>
                  <h3 className="text-[clamp(1.375rem,2.2vw,1.75rem)] font-medium leading-[1.18] tracking-[-0.018em] text-foreground">
                    {t(pain.titleKey)}
                  </h3>
                  <p className="max-w-sm text-[clamp(0.9375rem,0.98vw,1rem)] leading-[1.7] text-muted-foreground">
                    {t(pain.bodyKey)}
                  </p>
                </div>
              </div>
            </li>
          ))}
        </ul>
      </Container>
    </section>
  );
});