"use client";

import { Container } from "@/components/container";
import { SectionEndCta } from "@/components/sections/section-end-cta";
import { getTestimonialsForCaseStudy } from "@/lib/testimonials";
import { Link } from "@/i18n/navigation";
import { useLocale, useTranslations } from "next-intl";
import { getCaseStudyBySlug } from "@/lib/case-studies";

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

  let exists = false;
  try {
    exists = !!tCS(slug + ".name");
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  } catch (e) {
    exists = false;
  }

  if (!slug || !exists) {
    return (
      <section className="pt-(--section-y-top) pb-(--section-y-bottom)">
        <Container>
          <div className="max-w-2xl py-32">
            <p className="font-mono text-sm leading-normal tracking-wider uppercase rtl:font-sans rtl:normal-case rtl:tracking-normal text-muted-foreground/70 mb-4 block">
              {tLabels("caseStudy")}
            </p>
            <h1
              className="font-sans font-normal text-primary leading-[1.05] mb-4"
              style={{
                fontSize: "clamp(28px, 4.5vw, 52px)",
                letterSpacing: "-0.02em",
              }}
            >
              {tLabels("notFoundTitle")}
            </h1>
            <p className="text-base text-primary/60 leading-relaxed mb-8">
              {tLabels("notFoundBody")}
            </p>
            <Link
              href="/work"
              className="group inline-flex items-center gap-2 text-muted-foreground transition-colors duration-300 hover:text-foreground font-mono text-sm leading-normal tracking-wider uppercase rtl:font-sans rtl:normal-case rtl:tracking-normal"
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
    <section className="pt-(--section-y-top) pb-(--section-y-bottom)">
      <Container>
        <div className="py-12 md:py-24">
          <div className="mb-16">
            <p className="font-mono text-sm leading-normal tracking-wider uppercase rtl:font-sans rtl:normal-case rtl:tracking-normal text-muted-foreground/70 mb-4 block">
              {tLabels("caseStudy")} · {year}
            </p>
            <h1
              className="mb-4 font-sans font-normal text-primary leading-[1.03]"
              style={{
                fontSize: "clamp(36px, 6vw, 72px)",
                letterSpacing: "-0.025em",
              }}
            >
              {tCS(slug + ".name")}
            </h1>
            <p className="font-mono text-sm leading-normal tracking-wider uppercase text-primary/35 mb-5">
              {tCS(slug + ".client")} · {tCS(slug + ".industry")}
            </p>
            <p className="text-base text-primary/60 leading-relaxed max-w-[52ch]">
              {tCS(slug + ".summary")}
            </p>
          </div>
          <div className="grid gap-4 md:grid-cols-3 mb-16">
            {metrics.map((metric) => (
              <div
                key={metric.label}
                className="border border-foreground/8 rounded-lg bg-foreground/2 p-5 md:p-6"
              >
                <p className="font-mono text-sm leading-normal tracking-wider uppercase rtl:font-sans rtl:normal-case rtl:tracking-normal text-muted-foreground/70 mb-3">
                  {metric.label}
                </p>
                <p
                  className="font-sans font-light text-primary leading-none mb-1"
                  style={{
                    fontSize: "clamp(28px, 4vw, 40px)",
                    letterSpacing: "-0.03em",
                  }}
                >
                  {metric.value}
                </p>
              </div>
            ))}
          </div>

          <div className="h-px w-full bg-foreground/8 mb-16" />
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
                  content: tCS(slug + ".outcome"),
                },
              ].map(({ heading, content }) => (
                <section key={heading}>
                  <h2
                    className="font-sans font-normal text-primary leading-[1.05] mb-4"
                    style={{
                      fontSize: "clamp(20px, 2.5vw, 28px)",
                      letterSpacing: "-0.015em",
                    }}
                  >
                    {heading}
                  </h2>
                  <p className="text-base text-primary/60 leading-relaxed whitespace-pre-line">
                    {content}
                  </p>
                </section>
              ))}
            </div>
            <aside className="space-y-4">
              <div className="border border-foreground/8 rounded-lg bg-foreground/2 p-5">
                <h3 className="font-mono text-sm leading-normal tracking-wider uppercase rtl:font-sans rtl:normal-case rtl:tracking-normal text-muted-foreground/70 mb-4">
                  {tLabels("techStack")}
                </h3>
                <ul className="space-y-2">
                  {techStack.map((tech) => (
                    <li
                      key={tech}
                      className="flex items-center gap-3 text-sm text-primary/60"
                    >
                      <div className="h-px w-3 bg-foreground/8 shrink-0" />
                      {tech}
                    </li>
                  ))}
                </ul>
              </div>
              {externalUrl && (
                <div className="border border-foreground/8 rounded-lg bg-foreground/2 p-5">
                  <h3 className="font-mono text-sm leading-normal tracking-wider uppercase rtl:font-sans rtl:normal-case rtl:tracking-normal text-muted-foreground/70 mb-4">
                    {tLabels("liveSite")}
                  </h3>
                  <a
                    href={externalUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group inline-flex items-center gap-2 font-mono text-sm leading-normal tracking-wider uppercase text-primary/60 hover:text-primary transition-colors duration-300"
                  >
                    <span className="border-b border-foreground/8 group-hover:border-foreground/40 transition-colors duration-300 pb-0.5">
                      {tLabels("visitProj")}
                    </span>
                    <svg
                      className="h-3.5 w-3.5 rtl:-rotate-180"
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
                <div className="border border-foreground/8 rounded-lg bg-foreground/2 p-5">
                  <h3 className="font-mono text-sm leading-normal tracking-wider uppercase rtl:font-sans rtl:normal-case rtl:tracking-normal text-muted-foreground/70 mb-4">
                    {tLabels("clientPersp")}
                  </h3>
                  <blockquote className="text-base text-primary/60 leading-relaxed mb-4">
                    &ldquo;{testimonials[0].quote[locale as "en" | "ar"]}&rdquo;
                  </blockquote>
                  <p className="font-mono text-sm leading-normal tracking-wider text-primary/35 uppercase">
                    {testimonials[0].author} · {testimonials[0].company}
                  </p>
                </div>
              )}
              <div className="pt-2">
                <Link
                  href="/work"
                  className="group inline-flex items-center gap-2 text-muted-foreground transition-colors duration-300 hover:text-foreground font-mono text-sm leading-normal tracking-wider uppercase rtl:font-sans rtl:normal-case rtl:tracking-normal"
                >
                  <svg
                    className="h-3.5 w-3.5 rtl:rotate-180 transition-transform duration-300 ltr:group-hover:-translate-x-0.5"
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
