"use client";

import { Link } from "@/i18n/navigation";
import { getCaseStudyBySlug } from "@/lib/case-studies";
import { useTranslations } from "next-intl";
import { memo } from "react";

interface WorkItemProps {
  slug: string;
  index: number;
}

export const WorkItem = memo(function WorkItem({ slug, index }: WorkItemProps) {
  const tW = useTranslations("work");
  const tCS = useTranslations("caseStudies");

  const name = tCS(`${slug}.name`);
  const client = tCS(`${slug}.client`);
  const industry = tCS(`${slug}.industry`);
  const year = tCS(`${slug}.year`);
  const summary = tCS(`${slug}.summary`);
  const metrics = tCS.raw(`${slug}.metrics`) as Array<{
    label: string;
    value: string;
  }>;
  const externalUrl = getCaseStudyBySlug(slug)?.externalUrl;

  return (
    <article className="work-card group relative border-b border-foreground/8 py-10 overflow-hidden">
      <div
        aria-hidden
        className="absolute inset-0 bg-foreground/2 pointer-events-none origin-left rtl:origin-right scale-x-0 group-hover:scale-x-100 transition-transform duration-300 ease-out"
      />
      <div className="relative z-10 px-4">
        <div className="flex items-start justify-between gap-6 mb-4">
          <div className="flex items-baseline gap-6 md:gap-10">
            <span
              className="font-mono text-sm leading-normal tracking-wider font-light text-primary/20 group-hover:text-primary/55 transition-colors duration-300"
              style={{
                fontSize: "clamp(20px, 2.5vw, 28px)",
                letterSpacing: "-0.02em",
              }}
            >
              {String(index + 1).padStart(2, "0")}
            </span>
            <div>
              <h2
                className="font-sans font-medium text-primary transition-transform duration-300 mb-1 ltr:group-hover:translate-x-1.5 rtl:group-hover:-translate-x-1.5"
                style={{
                  fontSize: "clamp(18px, 2.5vw, 26px)",
                  letterSpacing: "-0.015em",
                }}
              >
                <Link
                  href={`/work/${slug}`}
                  className="before:absolute before:inset-0 before:z-0 outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-8 rounded-sm"
                >
                  {name}
                </Link>
              </h2>
              <p className="font-mono text-sm leading-normal tracking-wider uppercase rtl:font-sans rtl:normal-case rtl:tracking-normal text-foreground/35">
                {client} · {industry}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            <span className="font-mono text-sm leading-normal tracking-wider text-muted-foreground/70 hidden md:block">
              {year}
            </span>
            <svg
              className="h-4 w-4 text-muted-foreground/70 transition-all duration-300 ltr:group-hover:translate-x-1 rtl:group-hover:-translate-x-1 group-hover:text-primary/60 rtl:rotate-180"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={1.5}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M17 8l4 4m0 0l-4 4m4-4H3" />
            </svg>
          </div>
        </div>
        <div className="ps-[calc(clamp(20px,2.5vw,28px)+24px)] md:ps-[calc(clamp(20px,2.5vw,28px)+40px)]">
          <p className="text-base text-primary/60 leading-relaxed max-w-[52ch] mb-4">
            {summary}
          </p>
          <div className="flex items-center justify-between gap-4">
            <div className="relative z-10 flex flex-wrap gap-2 pointer-events-none">
              {metrics.slice(0, 2).map((metric) => (
                <div
                  key={metric.label}
                  className="inline-flex items-center gap-2 border border-foreground/8 bg-foreground/2 rounded-full px-3 py-1"
                >
                  <span className="font-mono text-sm leading-normal tracking-wider uppercase rtl:font-sans rtl:normal-case rtl:tracking-normal text-foreground/35">
                    {metric.label}
                  </span>
                  <span className="font-mono text-sm leading-normal tracking-wider text-primary/60">
                    {metric.value}
                  </span>
                </div>
              ))}
            </div>
            <div className="relative z-10 flex items-center gap-6">
              {externalUrl && (
                <a
                  href={externalUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-mono text-sm leading-normal tracking-wider uppercase rtl:font-sans rtl:normal-case rtl:tracking-normal text-primary/60 hover:text-primary transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-sm"
                >
                  {tW("labels.visitProj")} ↗
                </a>
              )}
              <span className="hidden md:inline-flex items-center gap-2 font-mono text-sm leading-normal tracking-wider text-primary/70 group-hover:text-primary/100 transition-colors duration-300 pointer-events-none">
                {tW("viewCaseStudy")}
              </span>
            </div>
          </div>
        </div>
      </div>
    </article>
  );
});
