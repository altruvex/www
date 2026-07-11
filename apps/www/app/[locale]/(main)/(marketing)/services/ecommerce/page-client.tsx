"use client";

import { CtaButtonGroup } from "@/components/interactive/cta-button-group";
import { ServiceHero } from "@/components/sections/service-hero";
import { Container } from "@/components/shared/container";
import { ArrowIcon } from "@/components/shared/directional-link";
import { Accent } from "@/components/ui/emphasis";
import { bodyMarks } from "@/components/ui/rich-text";
import { TiltCard } from "@/components/ui/tilt-card";
import { Link } from "@/i18n/navigation";
import { accentWorldClass } from "@/lib/config/accent-world";
import { getCommercialCta } from "@/lib/config/commercial";
import {
  MOTION,
  useSectionCardGrid,
  useSectionDescription,
  useSectionEyebrow,
  useSectionTitle,
} from "@/lib/motion";
import { monoCaps } from "@/lib/utils/mono-caps";
import { cn } from "@/lib/utils/utils";
import { useTranslations } from "next-intl";
import type { ReactNode } from "react";

export default function EcommerceServicePage() {
  return (
    <div className="relative min-h-screen w-full overflow-x-hidden">
      <HeroSection />
      <CapabilitiesSection />
      <ProofSection />
      <ClosingCtaSection />
    </div>
  );
}

function HeroSection() {
  const t = useTranslations("serviceDetails.ecommerce");
  const tCTAs = useTranslations("commercial.ctas");
  const projectRangeCta = getCommercialCta("projectRange");
  const realBuildCta = getCommercialCta("realBuild");

  return (
    <ServiceHero
      watermark="05"
      subtitle={t("subtitle")}
      title={t("title")}
      titleItalic={t("titleItalic")}
      description={t.rich("description", bodyMarks)}
      gridVisibility="md-up"
      showHorizontalGridLine={false}
      showScrollHint={false}
      primaryCta={{ href: projectRangeCta.href, label: tCTAs("projectRange") }}
      secondaryCta={{ href: realBuildCta.href, label: tCTAs("realBuild") }}
    />
  );
}

function CapabilityRow({
  item,
  featured,
}: {
  item: { num: string; title: string; description: string };
  featured: boolean;
}) {
  return (
    <div
      className={cn(
        "capability-row-anim group relative border-b border-foreground/10 transition-all duration-500 hover:bg-foreground/2",
        featured ? "border-t" : ""
      )}
    >
      <div
        className={cn(
          "flex flex-col md:flex-row gap-6 md:gap-16 items-start px-4 md:px-8",
          featured ? "py-16 md:py-24" : "py-10 md:py-14"
        )}
      >
        <div className="flex items-center gap-4 shrink-0 w-32">
          <div className="w-1.5 h-1.5 rounded-full bg-foreground/20 group-hover:bg-foreground/60 transition-all duration-500" />
          <span className="text-[13px] text-foreground/40 group-hover:text-foreground/70 transition-all duration-500">
            STORE // {item.num}
          </span>
        </div>
        <div className="flex-1 max-w-4xl">
          <h3
            className={cn(
              "font-sans font-normal text-foreground tracking-[-0.02em] ltr:group-hover:translate-x-2 rtl:group-hover:-translate-x-2 transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)]",
              featured
                ? "text-[clamp(1.8rem,2.5vw,2.8rem)] leading-[1.05] mb-6"
                : "text-[clamp(1rem,2vw,2rem)] leading-[1.1] mb-4"
            )}
          >
            {item.title}
          </h3>
          <p
            className={cn(
              "text-foreground/50 leading-relaxed font-light group-hover:text-foreground/70 transition-all duration-500",
              featured ? "text-[clamp(1rem,1vw,1.25rem)] max-w-3xl" : "md:text-base text-sm max-w-2xl"
            )}
          >
            {item.description}
          </p>
        </div>
      </div>
    </div>
  );
}

function CapabilitiesSection() {
  const t = useTranslations("serviceDetails.ecommerce.capabilities");
  const rawItems = t.raw("items") as Array<{ title: string; description: string }>;
  const items = rawItems.map((item, i) => ({
    ...item,
    num: String(i + 1).padStart(2, "0"),
  }));

  const eyebrowRef = useSectionEyebrow();
  const titleRef = useSectionTitle();
  const listRef = useSectionCardGrid<HTMLDivElement>({
    selector: ".capability-row-anim",
    stagger: 0.1,
    distance: 20,
  });

  return (
    <section
      className={cn(
        "border-t border-foreground/8 pt-(--section-y-top) pb-(--section-y-bottom)",
        accentWorldClass("green")
      )}
    >
      <Container>
        <div className="mb-16 md:mb-20 max-w-2xl">
          <p
            ref={eyebrowRef}
            className={cn(monoCaps, "text-muted-foreground mb-4 block")}
          >
            {t("eyebrow")}
          </p>
          <h2
            ref={titleRef}
            className="font-sans font-normal text-primary leading-[1.05]"
            style={{
              fontSize: "clamp(28px, 4.5vw, 52px)",
              letterSpacing: "-0.02em",
            }}
          >
            {t("title")}
          </h2>
          <p className="mt-6 text-base text-primary/60 leading-relaxed max-w-[64ch]">
            {t.rich("process", bodyMarks)}
          </p>
        </div>

        <div
          ref={listRef}
          className="flex flex-col relative before:absolute before:-start-4 before:top-0 before:bottom-0 before:w-px before:bg-foreground/5"
        >
          {items.map((item, i) => (
            <CapabilityRow key={item.title} item={item} featured={i === 0} />
          ))}
        </div>
      </Container>
    </section>
  );
}

function ProofLinkCard({
  href,
  eyebrow,
  title,
}: {
  href: string;
  eyebrow: ReactNode;
  title: string;
}) {
  return (
    <TiltCard subtle className="border border-border bg-surface/40">
      <Link href={href} className="group block p-6 md:p-8">
        <div className="flex items-start justify-between gap-4">
          <span className={cn(monoCaps, "text-muted-foreground")}>
            {eyebrow}
          </span>
          <ArrowIcon className="size-3.5 text-muted-foreground transition-all duration-300 group-hover:text-foreground ltr:group-hover:translate-x-0.5 rtl:group-hover:-translate-x-0.5" />
        </div>
        <p
          className="mt-8 font-sans font-normal text-primary leading-[1.1] group-hover:text-primary/80 transition-all duration-300"
          style={{ fontSize: "clamp(20px, 2.4vw, 28px)", letterSpacing: "-0.02em" }}
        >
          {title}
        </p>
      </Link>
    </TiltCard>
  );
}

function ProofSection() {
  const t = useTranslations("serviceDetails.ecommerce.proof");
  const descRef = useSectionDescription();
  const cardsRef = useSectionCardGrid<HTMLDivElement>({
    selector: "[data-proof-card]",
    distance: MOTION.distance.sm,
  });

  return (
    <section
      className={cn(
        "border-t border-foreground/8 pt-(--section-y-top) pb-(--section-y-bottom)",
        accentWorldClass("green")
      )}
    >
      <Container>
        <p className={cn(monoCaps, "text-local-accent mb-4 block")}>
          {t("eyebrow")}
        </p>
        <h2
          className="font-sans font-normal text-primary leading-[1.05] mb-4 max-w-2xl"
          style={{
            fontSize: "clamp(24px, 3.5vw, 40px)",
            letterSpacing: "-0.02em",
          }}
        >
          {t("title")} <Accent gradient="forest">{t("titleAccent")}</Accent>
        </h2>
        <p
          ref={descRef}
          className="text-base text-primary/60 leading-relaxed max-w-xl mb-10"
        >
          {t.rich("body", bodyMarks)}
        </p>
        <div ref={cardsRef} className="grid gap-4 sm:grid-cols-2">
          <div data-proof-card>
            <ProofLinkCard
              href="/work/art-lighting-store"
              eyebrow={t("eyebrow")}
              title="Art Lighting"
            />
          </div>
          <div data-proof-card>
            <ProofLinkCard
              href="/work/newlight-lighting-store"
              eyebrow={t("eyebrow")}
              title="NewLight"
            />
          </div>
        </div>
      </Container>
    </section>
  );
}

function ClosingCtaSection() {
  const t = useTranslations("serviceDetails.ecommerce.cta");
  const tCTAs = useTranslations("commercial.ctas");
  const technicalCallCta = getCommercialCta("technicalCall");
  const eyebrowRef = useSectionEyebrow();
  const titleRef = useSectionTitle();

  return (
    <section
      className={cn(
        "border-t border-foreground/8 pt-(--section-y-top) pb-(--section-y-bottom)",
        accentWorldClass("orange")
      )}
    >
      <Container>
        <div className="flex items-end justify-between gap-8 flex-wrap">
          <div className="max-w-xl">
            <p
              ref={eyebrowRef}
              className={cn(monoCaps, "text-local-accent mb-4 block")}
            >
              {t("eyebrow")}
            </p>
            <h2
              ref={titleRef}
              className="font-sans font-normal text-primary leading-[1.05] mb-4"
              style={{
                fontSize: "clamp(28px, 4.5vw, 52px)",
                letterSpacing: "-0.02em",
              }}
            >
              {t("title")} <Accent gradient="ember">{t("titleAccent")}</Accent>
            </h2>
            <p className="text-base text-primary/60 leading-relaxed max-w-[48ch]">
              {t.rich("description", bodyMarks)}
            </p>
          </div>
          <CtaButtonGroup
            primaryVariant="accent"
            primary={{ href: technicalCallCta.href, label: tCTAs("technicalCall") }}
            secondary={{ href: "/services", label: t("back") }}
            className="flex-col gap-3 sm:flex-col sm:items-stretch"
          />
        </div>
      </Container>
    </section>
  );
}
