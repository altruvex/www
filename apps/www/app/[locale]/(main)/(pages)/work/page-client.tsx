"use client";
import { Container } from "@/components/container";
import { CASE_STUDIES } from "@/lib/case-studies";
import { Link } from "@/i18n/navigation";
import { useTranslations, useLocale } from "next-intl";
import { DEFAULTS, MOTION, useReveal, useText } from "@/lib/motion";
import { memo, useMemo } from "react";

interface Metric {
  label: Record<string, string>;
  value: string;
}

interface CaseStudy {
  slug: string;
  name: Record<string, string>;
  client: Record<string, string>;
  industry: Record<string, string>;
  year: string;
  summary: Record<string, string>;
  metrics: Metric[];
}

export default memo(function WorkIndexPage() {
  const t = useTranslations("work");
  const locale = useLocale() as "en" | "ar";
  const eyebrowRef = useReveal({ ...DEFAULTS.body, ease: MOTION.ease.smooth });
  const titleRef = useText({ ...DEFAULTS.heading, ease: MOTION.ease.text });
  const descRef = useReveal({
    ...DEFAULTS.body,
    ease: MOTION.ease.smooth,
    delay: 0.15,
  });

  const projects = useMemo(() => CASE_STUDIES, []);

  return (
    <section className="flex min-h-screen items-center pt-(--section-y-top) pb-(--section-y-bottom)">
      <Container>
        <div className="py-16 md:py-24">
          <div className="mb-16">
            <p
              ref={eyebrowRef}
              className="font-mono text-sm leading-normal tracking-wider uppercase rtl:font-sans rtl:normal-case rtl:tracking-normal text-muted-foreground/70 mb-4 block"
            >
              {t("selectedWork")}
            </p>
            <h1
              ref={titleRef}
              className="text-[clamp(3rem,5vw,4.5rem)] leading-[1.02] tracking-[-0.03em] mb-8 font-sans font-light text-foreground select-none"
            >
              {t("title")}
              <br />
              <span className="font-serif italic font-light rtl:font-sans rtl:not-italic rtl:font-bold text-foreground/45">
                {t("titleItalic")}
              </span>
            </h1>
            <p
              ref={descRef}
              className="text-base text-primary/60 leading-relaxed max-w-[44ch]"
            >
              {t("description")}
            </p>
          </div>
          <div className="h-px w-full bg-foreground/8" />
          <div>
            {projects.map((cs, index) => (
              <WorkItem key={cs.slug} cs={cs} index={index} locale={locale} />
            ))}
          </div>
          <div className="mt-6 flex items-center gap-4">
            <span className="font-mono text-sm leading-normal tracking-wider uppercase text-primary/20">
              {String(projects.length).padStart(2, "0")} {t("projectsLabel")}
            </span>
            <div className="flex-1 h-px bg-foreground/5" />
          </div>
        </div>
      </Container>
    </section>
  );
});

const WorkItem = memo(function WorkItem({
  cs,
  index,
  locale,
}: {
  cs: CaseStudy;
  index: number;
  locale: "en" | "ar";
}) {
  const t = useTranslations("work");
  return (
    <article>
      <Link href={`/work/${cs.slug}`}>
        <div className="group relative border-b border-foreground/8 py-10 cursor-pointer overflow-hidden">
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
                    {cs.name[locale]}
                  </h2>
                  <p className="font-mono text-sm leading-normal tracking-wider  uppercase rtl:font-sans rtl:normal-case rtl:tracking-normal text-foreground/35">
                    {cs.client[locale]} · {cs.industry[locale]}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3 shrink-0">
                <span className="font-mono text-sm leading-normal tracking-wider text-muted-foreground/70 hidden md:block">
                  {cs.year}
                </span>
                <svg
                  className="h-4 w-4 text-muted-foreground/70 transition-all duration-300 ltr:group-hover:translate-x-1 rtl:group-hover:-translate-x-1 group-hover:text-primary/60 rtl:rotate-180"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={1.5}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M17 8l4 4m0 0l-4 4m4-4H3"
                  />
                </svg>
              </div>
            </div>

            <div className="ps-[calc(clamp(20px,2.5vw,28px)+24px)] md:ps-[calc(clamp(20px,2.5vw,28px)+40px)]">
              <p className="text-base text-primary/60 leading-relaxed max-w-[52ch] mb-4">
                {cs.summary[locale]}
              </p>

              <div className="flex items-center justify-between gap-4">
                <div className="flex flex-wrap gap-2">
                  {cs.metrics.slice(0, 2).map((metric: Metric) => (
                    <div
                      key={metric.label[locale]}
                      className="inline-flex items-center gap-2 border border-foreground/8 bg-foreground/2 rounded-full px-3 py-1"
                    >
                      <span className="font-mono text-sm leading-normal tracking-wider uppercase rtl:font-sans rtl:normal-case rtl:tracking-normal text-foreground/35">
                        {metric.label[locale]}
                      </span>
                      <span className="font-mono text-sm leading-normal tracking-wider text-primary/60">
                        {metric.value}
                      </span>
                    </div>
                  ))}
                </div>
                <span className="hidden md:inline-flex items-center gap-2 font-mono text-sm leading-normal tracking-wider text-primary/70 group-hover:text-primary/70 transition-colors duration-300">
                  {t("viewCaseStudy")}
                </span>
              </div>
            </div>
          </div>
        </div>
      </Link>
    </article>
  );
});
