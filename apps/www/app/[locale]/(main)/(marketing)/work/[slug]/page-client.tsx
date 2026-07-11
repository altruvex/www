"use client";

import { SectionEndCta } from "@/components/sections/section-end-cta";
import { Container } from "@/components/shared/container";
import { Eyebrow } from "@/components/ui/eyebrow";
import { bodyMarks } from "@/components/ui/rich-text";
import { TiltCard } from "@/components/ui/tilt-card";
import { Link } from "@/i18n/navigation";
import { getCaseStudyBySlug } from "@/lib/data/case-studies";
import { getTestimonialsForCaseStudy } from "@/lib/data/testimonials";
import { useSectionCardGrid, useSectionDescription, useSectionEyebrow, useSectionTitle } from "@/lib/motion";
import { useLocale, useTranslations } from "next-intl";

type WorkCaseStudyPageClientProps = {
  locale: string;
  slug: string;
};

export default function WorkCaseStudyPageClient({
  slug,
}: WorkCaseStudyPageClientProps) {
  const locale = useLocale();
  const tLabels = useTranslations("work.labels");
  const tCS = useTranslations("caseStudies");
  const testimonials = slug ? getTestimonialsForCaseStudy(slug) : [];

  const eyebrowRef = useSectionEyebrow<HTMLParagraphElement>();
  const titleRef = useSectionTitle<HTMLHeadingElement>();
  const descRef = useSectionDescription<HTMLParagraphElement>();
  const metricsRef = useSectionCardGrid<HTMLDivElement>();

  let exists = false;
  try {
    exists = !!tCS(slug + ".name");
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  } catch (e) {
    exists = false;
  }

  if (!slug || !exists) {
    return (
      <section className="accent-world-orange pt-(--section-y-top) pb-(--section-y-bottom)">
        <Container>
          <div className="max-w-2xl py-32">
            <Eyebrow ref={eyebrowRef} className="mb-4 block">{tLabels("caseStudy")}</Eyebrow>
            <h1
              ref={titleRef}
              className="font-sans font-normal text-primary leading-[1.05] tracking-[-0.02em] text-[clamp(28px,4.5vw,52px)] mb-4"
            >
              {tLabels("notFoundTitle")}
            </h1>
            <p ref={descRef} className="text-base text-s-mid leading-relaxed mb-8">
              {tLabels("notFoundBody")}
            </p>
            <Link
              href="/work"
              className="group inline-flex items-center gap-2 text-muted-foreground transition-all duration-300 hover:text-foreground eyebrow"
            >
              <svg
                className="h-3.5 w-3.5 rtl:rotate-180"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M7 16l-4-4m0 0l4-4m-4 4h18"
                />
              </svg>
              {tLabels("backLink")}
            </Link>
          </div>
        </Container>
      </section>
    );
  }

  const metrics = tCS.raw(slug + ".metrics") as Array<{
    label: string;
    value: string;
  }>;
  const techStack = tCS.raw(slug + ".techStack") as string[];
  const year = tCS(slug + ".year");
  const csData = getCaseStudyBySlug(slug);
  const externalUrl = csData?.externalUrl;

  return (
    <>
    <section className="accent-world-green pt-(--section-y-top) pb-(--section-y-bottom)">
      <Container>
        <div>
          <div className="mb-16">
            <Eyebrow ref={eyebrowRef} className="mb-4 block">{tLabels("caseStudy")} · {year}</Eyebrow>
            <h1
              ref={titleRef}
              className="mb-4 font-sans font-normal text-primary leading-[1.03] tracking-tight text-[clamp(36px,6vw,72px)]"
            >
              {tCS(slug + ".name")}
            </h1>
            <p className="font-mono text-sm leading-normal tracking-wider uppercase text-s-low mb-5">
              {tCS(slug + ".client")} · {tCS(slug + ".industry")}
            </p>
            <p ref={descRef} className="text-base text-s-mid leading-relaxed">
              {tCS(slug + ".summary")}
            </p>
          </div>
          <div
            ref={metricsRef}
            className="accent-world-green grid gap-4 md:grid-cols-3 mb-16"
          >
            {metrics.map((metric) => (
              <div
                key={metric.label}
                className="group/metric relative overflow-hidden rounded-lg border border-s-border bg-card p-5 md:p-6 shadow-card transition-all duration-300 hover:border-s-border-hover"
              >
                <div
                  aria-hidden
                  className="absolute inset-x-0 top-0 h-px bg-local-accent/40 transition-all duration-300 group-hover/metric:bg-local-accent"
                />
                <p className="font-sans font-light text-local-accent leading-none tracking-[-0.03em] text-[clamp(28px,4vw,40px)] mb-3">
                  {metric.value}
                </p>
                <Eyebrow tone="accent">{metric.label}</Eyebrow>
              </div>
            ))}
          </div>
          <div className="h-px w-full bg-s-border mb-16" />
          <div className="grid gap-12 md:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
            <div className="space-y-12">
              {[
                {
                  heading: tLabels("challenge"),
                  content: tCS(slug + ".problem"),
                },
                {
                  heading: tLabels("approach"),
                  content: tCS(slug + ".solution"),
                },
                {
                  heading: tLabels("results"),
                  content: tCS.rich(slug + ".outcome", bodyMarks),
                },
              ].map(({ heading, content }) => (
                <section key={heading}>
                  <h2 className="flex items-center gap-3 font-sans font-normal text-primary leading-[1.05] tracking-[-0.015em] text-[clamp(20px,2.5vw,28px)] mb-4">
                    <span aria-hidden className="h-4 w-px bg-local-accent" />
                    {heading}
                  </h2>
                  <p className="text-base text-s-mid leading-relaxed whitespace-pre-line">
                    {content}
                  </p>
                </section>
              ))}
            </div>
            <aside className="space-y-4">
              <div className="rounded-lg border border-s-border bg-card p-5 shadow-card">
                <h3 className="eyebrow text-s-low mb-4">
                  {tLabels("techStack")}
                </h3>
                <ul className="space-y-2.5">
                  {techStack.map((tech) => (
                    <li
                      key={tech}
                      className="flex items-center gap-3 text-sm text-s-mid"
                    >
                      <span aria-hidden className="h-1 w-1 rounded-full bg-local-accent shrink-0" />
                      {tech}
                    </li>
                  ))}
                </ul>
              </div>
              {externalUrl && (
                <div className="rounded-lg border border-s-border bg-card p-5 shadow-card">
                  <h3 className="eyebrow text-s-low mb-4">
                    {tLabels("liveSite")}
                  </h3>
                  <a
                    href={externalUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group inline-flex items-center gap-2 font-mono text-sm leading-normal tracking-wider uppercase text-s-mid hover:text-primary transition-all duration-300 rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                  >
                    <span className="font-bold border-b border-s-border-hover group-hover:border-local-accent group-hover:text-local-accent transition-all duration-300 pb-0.5">
                      {tLabels("visitProj")}
                    </span>
                    <svg
                      className="h-5 w-5 rtl:-rotate-180 transition-all duration-300 group-hover:text-local-accent ltr:group-hover:translate-x-0.5 rtl:group-hover:-translate-x-0.5"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M17 8l4 4m0 0l-4 4m4-4H3"
                      />
                    </svg>
                  </a>
                </div>
              )}
              {testimonials.length > 0 && (
                // Testimonial spotlight: the one third-party voice on the page.
                // Tilt communicates "this surface is featured — lean in."
                <TiltCard subtle>
                  <figure className="rounded-lg border border-s-border bg-card p-5 shadow-card">
                    <h3 className="eyebrow text-s-low mb-4">
                      {tLabels("clientPersp")}
                    </h3>
                    <blockquote className="text-base text-s-high leading-relaxed mb-4">
                      &ldquo;{testimonials[0].quote[locale as "en" | "ar"]}&rdquo;
                    </blockquote>
                    <figcaption className="text-sm leading-normal text-s-low">
                      {testimonials[0].author} · {testimonials[0].company}
                    </figcaption>
                  </figure>
                </TiltCard>
              )}
              <div className="pt-2">
                <Link
                  href="/work"
                  className="group inline-flex items-center gap-2 text-muted-foreground transition-all duration-300 hover:text-foreground eyebrow"
                >
                  <svg
                    className="h-3.5 w-3.5 rtl:rotate-180 transition-all duration-300 ltr:group-hover:-translate-x-0.5"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M7 16l-4-4m0 0l4-4m-4 4h18"
                    />
                  </svg>
                  {tLabels("backLink")}
                </Link>
              </div>
            </aside>
          </div>
        </div>
      </Container>
    </section>
    <SectionEndCta variant="work" />
    </>
  );
}
