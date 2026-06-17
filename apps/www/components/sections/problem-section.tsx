"use client";
import { Container } from "@/components/container";
import { Eyebrow } from "@/components/ui/eyebrow";
import { ArrowLabel } from "@/components/directional-link";
import { MagneticButton } from "@/components/magnetic-button";
import { Link } from "@/i18n/navigation";
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
  const gridRef = useSectionCardGrid<HTMLDivElement>({ selector: "[data-pain]", stagger: 0.06 });

  return (
    <section
      id="problem"
      className="relative border-y border-border bg-background pt-(--section-y-top) pb-(--section-y-bottom)"
    >
      <Container>
        <div className="mb-12 gap-6 flex flex-col md:flex-row items-center justify-between">
          <div className="max-w-3xl space-y-4">
            <Eyebrow ref={eyebrowRef}>
              {t("problem.badge")}
            </Eyebrow>
            <h2
              ref={titleRef}
              className="text-[clamp(2.125rem,4vw,3.25rem)] leading-[1.08] font-normal tracking-tight text-foreground"
            >
              {t("problem.title.pre")} {t("problem.title.crossed")} <br />
              <span className="font-serif italic font-light text-foreground/45 rtl:font-sans rtl:not-italic rtl:font-bold">
                {t("problem.title.gradient")}
              </span>
            </h2>
            <p
              ref={descRef}
              className="text-[clamp(1.0625rem,1.05vw,1.125rem)] leading-[1.75] text-muted-foreground max-w-2xl"
            >
              {t("problem.subtitle")}
            </p>
          </div>
        </div>
        <div
          ref={gridRef}
          className="grid grid-cols-1 md:grid-cols-2 border-t border-border"
        >
          {PAINS.map((pain, i) => (
            <div
              key={pain.number}
              data-pain
              className={`
                group relative px-6 py-10 md:px-12 md:py-16 border-b border-border
                ${i % 2 === 0 ? "md:border-e" : ""}
              `}
            >
              <div className="flex items-start gap-6 relative z-10">
                <span className="font-mono leading-normal uppercase text-2xl tracking-widest text-muted-foreground tabular-nums rtl:tracking-normal mt-1.5 shrink-0">
                  {pain.number}
                </span>
                <div className="space-y-3">
                  <h3 className="text-[clamp(1.5rem,2.4vw,2rem)] leading-[1.15] tracking-[-0.018em] font-medium text-foreground">
                    <span className="mb-1.5 block font-mono text-[13px] uppercase tracking-[0.18em] text-muted-foreground rtl:tracking-normal">
                      {stepLabel} {pain.number}
                    </span>
                    {t(pain.titleKey)}
                  </h3>
                  <p className="text-[clamp(0.9375rem,0.98vw,1rem)] leading-[1.7] text-muted-foreground max-w-sm">
                    {t(pain.bodyKey)}
                  </p>
                </div>
              </div>
              <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none bg-linear-to-br from-muted/50 to-transparent" />
            </div>
          ))}
        </div>
        <div className="mt-12 flex">
          <MagneticButton asChild size="lg" variant="secondary" className="group">
            <Link href={auditCta.href}>
              <ArrowLabel>{tCTAs("technicalAudit")}</ArrowLabel>
            </Link>
          </MagneticButton>
        </div>
      </Container>
    </section>
  );
});
