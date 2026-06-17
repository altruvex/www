"use client";
import { PageHero } from "@/components/sections/page-hero";
import { useSectionTitle, useSectionDescription, useSectionElement, useSectionCardGrid } from "@/lib/motion";

import { Container } from "@/components/container";
import { SectionEndCta } from "@/components/sections/section-end-cta";
import { useTranslations } from "next-intl";

export default function StandardsPage() {
  return (
    <div className="relative min-h-screen w-full">
      <OpeningSection />
      <CategoriesSection />
      <ClosingSection />
      <SectionEndCta variant="contact" />
    </div>
  );
}

function OpeningSection() {
  const t = useTranslations("standards.hero");
  const metricsRef = useSectionElement();

  return (
    <PageHero
      eyebrow={t("eyebrow")}
      title={t("title")}
      description={t("description")}
    >
      <div
        ref={metricsRef}
        // Color world: forest green. Proof archetype — quality benchmarks.
        className="accent-world-green grid gap-4 md:grid-cols-3"
      >
            {[
              {
                label: t("metrics.performance.label"),
                value: "90+",
                sub: t("metrics.performance.sub"),
              },
              {
                label: t("metrics.accessibility.label"),
                value: "95+",
                sub: t("metrics.accessibility.sub"),
              },
              {
                label: t("metrics.webVitals.label"),
                value: null,
                sub: t("metrics.webVitals.description"),
              },
            ].map(({ label, value, sub }, i) => (
              <div
                key={i}
                className="border border-foreground/8 rounded-lg bg-foreground/2 p-5"
              >
                <p className="font-mono text-sm leading-normal tracking-wider  uppercase rtl:font-sans rtl:normal-case rtl:tracking-normal text-local-accent mb-3">
                  {label}
                </p>
                {value ? (
                  <p
                    className="font-sans font-light text-local-accent leading-none"
                    style={{
                      fontSize: "clamp(28px, 4vw, 40px)",
                      letterSpacing: "-0.03em",
                    }}
                  >
                    {value}
                    <span className="font-mono text-sm leading-normal tracking-wider  text-primary/35 uppercase ml-2">
                      {sub}
                    </span>
                  </p>
                ) : (
                  <p className="text-sm text-primary/60 leading-relaxed">
                    {sub}
                  </p>
                )}
              </div>
            ))}
          </div>
    </PageHero>
  );
}

function CategoriesSection() {
  const t = useTranslations("standards");
  const tCat = useTranslations("standards.categories");
  const sectionRef = useSectionCardGrid<HTMLElement>({ selector: "[data-category]" });

  const categories = ["code", "performance", "accessibility", "security"];

  return (
    <section
      ref={sectionRef}
      className="accent-world-green pt-(--section-y-top) pb-(--section-y-bottom) border-t border-foreground/8"
    >
      <Container>
        <div>
          {categories.map((cat, i) => (
            <div
              key={cat}
              data-category
              className="border-b border-foreground/8 py-12 md:py-16 grid gap-8 md:grid-cols-[56px_1fr] items-start"
            >
              <span className="font-mono text-sm leading-normal tracking-wider uppercase text-foreground/20 rtl:font-sans rtl:normal-case rtl:tracking-normal pt-2">
                {String(i + 1).padStart(2, "0")}
              </span>
              <div className="max-w-4xl">
                <h2
                  className="font-sans font-normal text-primary leading-[1.05] mb-4"
                  style={{
                    fontSize: "clamp(28px, 4.5vw, 52px)",
                    letterSpacing: "-0.02em",
                  }}
                >
                  {tCat(`${cat}.title`)}
                </h2>
                <p className="text-base text-primary/60 leading-relaxed mb-10 max-w-[52ch]">
                  {tCat(`${cat}.description`)}
                </p>
                <div className="grid gap-4 md:grid-cols-2">
                  {[
                    {
                      heading: t("requirements"),
                      items: tCat(`${cat}.requirements`).split(" | "),
                    },
                    {
                      heading: t("benchmarks"),
                      items: tCat(`${cat}.benchmarks`).split(" | "),
                    },
                  ].map(({ heading, items }) => (
                    <div
                      key={heading}
                      className="border border-foreground/8 rounded-lg bg-foreground/2 p-6"
                    >
                      <h3 className="eyebrow text-muted-foreground/70 mb-4">
                        {heading}
                      </h3>
                      <div className="space-y-3">
                        {items.map((item: string, j: number) => (
                          <div key={j} className="flex items-start gap-3">
                            <div className="h-px w-3 bg-foreground/8 mt-2.5 shrink-0" />
                            <p className="text-sm text-primary/60 leading-relaxed">
                              {item}
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      </Container>
    </section>
  );
}

function ClosingSection() {
  const t = useTranslations("standards.enforcement");
  const titleRef = useSectionTitle();
  const descRef = useSectionDescription<HTMLParagraphElement>();

  return (
    <section className="accent-world-green pt-(--section-y-top) pb-(--section-y-bottom) border-t border-foreground/8">
      <Container>
        <div className="max-w-3xl">
          <div className="mb-10">
            <h2
              ref={titleRef}
              className="font-sans font-normal text-primary leading-[1.05]"
              style={{
                fontSize: "clamp(28px, 4.5vw, 52px)",
                letterSpacing: "-0.02em",
              }}
            >
              {t("title")}
              <br />
              <span className="font-serif italic font-light rtl:font-sans rtl:not-italic rtl:font-bold text-foreground/45">
                {t("titleItalic")}
              </span>
            </h2>
          </div>
          <p
            ref={descRef}
            className="text-base text-primary/60 leading-relaxed"
          >
            {t("description")}
          </p>
        </div>
      </Container>
    </section>
  );
}
