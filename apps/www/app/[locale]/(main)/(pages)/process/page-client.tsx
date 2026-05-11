"use client";

import { Container } from "@/components/container";
import { MagneticButton } from "@/components/magnetic-button";
import { Link } from "@/i18n/navigation";
import { DEFAULTS, MOTION, useReveal, useText, useBatch } from "@/lib/motion";
import { localizeNumbers } from "@/lib/number";
import { useLocale, useTranslations } from "next-intl";

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
  const eyebrowRef = useReveal({ ...DEFAULTS.body, delay: 0 });
  const titleRef = useText({ ...DEFAULTS.heading, ease: MOTION.ease.text });
  const descRef = useReveal({ ...DEFAULTS.body, delay: 0.15 });

  return (
    <section className="flex min-h-screen items-center pt-(--section-y-top) pb-(--section-y-bottom)">
      <Container>
        <div className="sm:max-w-5xl max-w-full">
          <p
            ref={eyebrowRef}
            className="font-mono text-sm leading-normal tracking-wider uppercase rtl:font-sans rtl:normal-case rtl:tracking-normal text-muted-foreground/70 mb-6 block"
          >
            {t("eyebrow")}
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
          <div className="grid md:grid-cols-[80px_1fr] gap-8 items-start">
            <div className="h-px w-full bg-foreground/8 mt-3 hidden md:block" />
            <p
              ref={descRef}
              className="text-base text-primary/60 leading-relaxed max-w-[52ch]"
            >
              {t("description")}
            </p>
          </div>
        </div>
      </Container>
    </section>
  );
}

function PhasesList() {
  const t = useTranslations("process.phases");
  const sectionRef = useBatch<HTMLElement>({ selector: "[data-phase]" });
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
      className="pt-(--section-y-top) pb-(--section-y-bottom) border-t border-foreground/8"
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
                <p className="font-mono text-sm leading-normal tracking-wider uppercase rtl:font-sans rtl:normal-case rtl:tracking-normal text-muted-foreground/70">
                  {localizeNumbers(t(`${phase.key}.timeline`), locale)}
                </p>
              </div>
              <div>
                <h3
                  className="font-sans font-medium text-primary mb-4 group-hover:text-primary/80 transition-colors duration-300"
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
                  <p className="font-mono text-sm leading-normal tracking-wider uppercase rtl:font-sans rtl:normal-case rtl:tracking-normal text-muted-foreground/70 mb-2">
                    {t("deliverables")}
                  </p>
                  <p className="text-sm text-primary/60 leading-relaxed">
                    {t(`${phase.key}.deliverables`)}
                  </p>
                </div>
                <div>
                  <p className="font-mono text-sm leading-normal tracking-wider uppercase rtl:font-sans rtl:normal-case rtl:tracking-normal text-muted-foreground/70 mb-2">
                    {t("yourRole")}
                  </p>
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
  const titleRef = useText({ ...DEFAULTS.heading, ease: MOTION.ease.text });
  const descRef = useReveal({ ...DEFAULTS.body, delay: 0.15 });
  const ctaRef = useReveal({ ...DEFAULTS.element, delay: 0.25 });

  return (
    <section className="pt-(--section-y-top) pb-(--section-y-bottom) border-t border-foreground/8">
      <Container>
        <div className="max-w-3xl">
          <div ref={titleRef} className="mb-12">
            <h2
              className="font-sans font-normal text-primary leading-[1.05]"
              style={{
                fontSize: "clamp(28px, 4.5vw, 52px)",
                letterSpacing: "-0.02em",
              }}
            >
              {t("flexibility.title")}
            </h2>
          </div>
          <p
            ref={descRef}
            className="text-base text-primary/60 leading-relaxed mb-12"
          >
            {t("flexibility.description")}
          </p>
          <div ref={ctaRef}>
            <Link href="/schedule">
              <MagneticButton variant="primary" size="lg" className="group">
                <span className="flex items-center gap-2">
                  {t("closing.cta")}
                  <svg
                    className="w-4 h-4 transition-transform duration-300 ltr:group-hover:translate-x-1 rtl:group-hover:-translate-x-1 rtl:-rotate-180"
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
