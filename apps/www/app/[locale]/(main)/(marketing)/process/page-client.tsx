"use client";

import { Container } from "@/components/shared/container";
import { MagneticButton } from "@/components/magnetic-button";
import { Eyebrow } from "@/components/ui/eyebrow";
import { PageHero } from "@/components/sections/page-hero";
import { SectionHeading } from "@/components/sections/section-heading";
import { Link } from "@/i18n/navigation";
import { useSectionCardGrid, useSectionDescription, useSectionElement, useSectionTitle } from "@/lib/motion";
import { localizeNumbers } from "@/lib/utils/number";
import { useLocale, useTranslations } from "next-intl";
import { bodyMarks } from "@/components/ui/rich-text";

export default function ProcessPage() {
  return (
    <div className="relative min-h-screen w-full">
      <OpeningSection />
      <PhasesList />
      <ClosingSection />
    </div>
  );
}

function OpeningSection() {
  const t = useTranslations("process.hero");

  return (
    <PageHero
      eyebrow={t("eyebrow")}
      title={t("title")}
      titleItalic={t("titleItalic")}
      description={t("description")}
    />
  );
}

function PhasesList() {
  const t = useTranslations("process.phases");
  const sectionRef = useSectionCardGrid<HTMLElement>({ selector: "[data-phase]" });
  const locale = useLocale();

  const phases = [
    { number: "1", key: "discovery" },
    { number: "2", key: "wireframe" },
    { number: "3", key: "design" },
    { number: "4", key: "development" },
    { number: "5", key: "launch" },
  ];

  return (
    <section
      ref={sectionRef}
      className="accent-world-green pt-(--section-y-top) pb-(--section-y-bottom) border-t border-foreground/8"
    >
      <Container>
        <div>
          {phases.map((phase, i) => (
            <div
              key={i}
              data-phase
              className="group border-b border-foreground/8 py-10 md:py-12 grid gap-8 md:grid-cols-[180px_1fr_1fr] items-start"
            >
              <div>
                <div
                  aria-hidden
                  className="font-mono text-sm leading-normal tracking-wider font-light text-primary/[0.07] select-none mb-3"
                  style={{
                    fontSize: "clamp(64px, 9vw, 96px)",
                    letterSpacing: "-0.04em",
                  }}
                >
                  {localizeNumbers(phase.number, locale)}
                </div>
                <Eyebrow>{localizeNumbers(t(`${phase.key}.timeline`), locale)}</Eyebrow>
              </div>
              <div>
                <h3
                  className="font-sans font-medium text-primary mb-4 group-hover:text-primary/80 transition-all duration-300"
                  style={{
                    fontSize: "clamp(18px, 2.5vw, 24px)",
                    letterSpacing: "-0.015em",
                  }}
                >
                  {t(`${phase.key}.title`)}
                </h3>
                <p className="text-base text-primary/60 leading-relaxed max-w-[38ch]">
                  {t(`${phase.key}.description`)}
                </p>
              </div>
              <div className="space-y-5">
                <div>
                  <Eyebrow className="mb-2">{t("deliverables")}</Eyebrow>
                  <p className="text-sm text-primary/60 leading-relaxed">
                    {t(`${phase.key}.deliverables`)}
                  </p>
                </div>
                <div>
                  <Eyebrow className="mb-2">{t("yourRole")}</Eyebrow>
                  <p className="text-sm text-primary/60 leading-relaxed">
                    {t(`${phase.key}.yourRole`)}
                  </p>
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
  const t = useTranslations("process");
  const titleRef = useSectionTitle();
  const descRef = useSectionDescription();
  const ctaRef = useSectionElement();

  return (
    <section
      className="accent-world-orange pt-(--section-y-top) pb-(--section-y-bottom) border-t border-foreground/8"
    >
      <Container>
        <div className="max-w-3xl">
          <SectionHeading
            titleRef={titleRef}
            descriptionRef={descRef}
            firstTitle={t("flexibility.title")}
            secondTitle={t("flexibility.titleItalic")}
            accent="ember"
            secondTitleBreak={false}
            description={t.rich("flexibility.description", bodyMarks)}
            className="mb-12 block"
            classes={{
              titleWrapper: "space-y-0",
              title: "leading-[1.05] text-[clamp(28px,4.5vw,52px)] tracking-[-0.02em] text-primary",
              description: "max-w-none mb-12 text-base leading-relaxed text-primary/60",
            }}
          />
          <div ref={ctaRef}>
            <Link href="/schedule">
              <MagneticButton variant="accent" size="lg" className="group">
                <span className="flex items-center gap-2">
                  {t("closing.cta")}
                  <svg
                    className="w-4 h-4 transition-all duration-300 ltr:group-hover:translate-x-1 rtl:group-hover:-translate-x-1 rtl:-rotate-180"
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
                </span>
              </MagneticButton>
            </Link>
          </div>
        </div>
      </Container>
    </section>
  );
}
