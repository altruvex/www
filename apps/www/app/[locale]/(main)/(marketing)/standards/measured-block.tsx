"use client";

import { SectionHeading } from "@/components/sections/section-heading";
import { Container } from "@/components/shared/container";
import { QUALITY_METRICS, type QualityProject } from "@/lib/data/quality-metrics";
import { useTranslations } from "next-intl";

const CELL = "border-s border-border-subtle px-4 py-4 text-start tabular-nums";
const STICKY =
  "sticky start-0 z-1 border-e border-border-subtle bg-background px-4 py-4 text-start font-normal";

type Metric = {
  key: "performance" | "accessibility" | "bestPractices" | "seo" | "lcp" | "cls" | "tbt";
  value: (p: QualityProject) => string;
};

/** Latin digits in every locale (Ali 2026-10-04): format with en-US, never the page locale. */
const int = (n: number) => n.toLocaleString("en-US");

export function MeasuredBlock() {
  const t = useTranslations("standards.measured");
  const { measuredOn, tool, projects } = QUALITY_METRICS;
  if (projects.length === 0) return null;

  const metrics: readonly Metric[] = [
    { key: "performance", value: (p) => int(p.performance) },
    { key: "accessibility", value: (p) => int(p.accessibility) },
    { key: "bestPractices", value: (p) => int(p.bestPractices) },
    { key: "seo", value: (p) => int(p.seo) },
    { key: "lcp", value: (p) => t("ms", { value: int(p.lcpMs) }) },
    { key: "cls", value: (p) => p.cls.toLocaleString("en-US", { maximumFractionDigits: 3 }) },
    { key: "tbt", value: (p) => t("ms", { value: int(p.tbtMs) }) },
  ];

  return (
    <section aria-labelledby="standards-measured-heading" className="py-(--section-y-top)">
      <Container>
        <SectionHeading
          titleAs="h2"
          titleId="standards-measured-heading"
          eyebrow={t("eyebrow")}
          firstTitle={t("title")}
          secondTitle={t("titleItalic")}
          description={t("description")}
        />

        <div className="mt-(--heading-gap) overflow-clip rounded-panel-md border border-border-subtle">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[46rem] border-collapse text-[0.9375rem]">
              <caption className="sr-only">{t("caption")}</caption>
              <thead>
                <tr className="text-muted-foreground">
                  <th scope="col" className={STICKY}>
                    {t("project")}
                  </th>
                  {metrics.map((m) => (
                    <th key={m.key} scope="col" className={`${CELL} font-normal`}>
                      {t(m.key)}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {projects.map((p) => (
                  <tr key={p.url} className="border-t border-border-subtle">
                    <th scope="row" className={STICKY}>
                      <a
                        href={p.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        dir="ltr"
                        className="rounded-ctl-xs underline decoration-border underline-offset-4 transition-colors duration-(--motion-hover) hover:text-brand-text focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
                      >
                        {p.name}
                      </a>
                    </th>
                    {metrics.map((m) => (
                      <td key={m.key} dir="ltr" className={`${CELL} text-foreground`}>
                        {m.value(p)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <p className="mt-4 text-sm text-muted-foreground">
          <time dateTime={measuredOn} dir="ltr">
            {t("measuredOn", { date: measuredOn })}
          </time>
          {" · "}
          <span dir="ltr">{tool}</span>
        </p>
      </Container>
    </section>
  );
}
