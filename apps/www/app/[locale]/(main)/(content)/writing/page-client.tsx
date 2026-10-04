"use client";
import { Container } from "@/components/shared/container";
import { HeroHeadline, HeroReveal } from "@/components/sections/hero-motion-wrappers";
import { SectionEndCta } from "@/components/sections/section-end-cta";
import { bodyMarks } from "@/components/ui/rich-text";
import { Highlight } from "@/components/ui/emphasis";
import { Eyebrow } from "@/components/ui/eyebrow";
import type { ArticleListItem } from "@/types/mdx";
import { useTranslations } from "next-intl";
import { WritingIndex } from "./writing-index";

type WritingPageClientProps = {
  articles: ArticleListItem[];
  locale: "en" | "ar";
};

export default function WritingPage({
  articles,
  locale,
}: WritingPageClientProps) {
  return (
    <div className="relative min-h-screen w-full">
      <OpeningSection />
      <WritingIndex articles={articles} locale={locale} />
      <WritingEndCta />
    </div>
  );
}

function WritingEndCta() {
  const t = useTranslations("common.endCta.pages.writing");

  return (
    <SectionEndCta
      title={t("title")}
      titleAccent={t("titleAccent")}
      body={t("body")}
      primary="projectRange"
      secondary="technicalAudit"
    />
  );
}

function OpeningSection() {
  const t = useTranslations("writing");

  return (
    <section className="accent-world-blue pt-(--section-y-top)">
      <Container className="pt-10 md:pt-14">
        <HeroReveal delay={0.2} className="mb-6">
          <Eyebrow>{t("eyebrow")}</Eyebrow>
        </HeroReveal>

        <HeroHeadline
          as="h1"
          className="max-w-[14ch] text-balance font-sans text-[clamp(2.75rem,7vw,7rem)] leading-[1.02] font-light tracking-[-0.03em] text-foreground select-none rtl:max-w-[16ch] rtl:leading-[1.2] rtl:tracking-normal"
        >
          <span className="block">{t("hero.title")}</span>
          <Highlight tone="soft" className="block tracking-[-0.02em] rtl:tracking-normal">
            {t("hero.titleItalic")}
          </Highlight>
        </HeroHeadline>

        <div className="mt-10 grid gap-8 md:mt-14 lg:grid-cols-12 lg:gap-12">
          <HeroReveal delay={0.5} className="lg:col-span-5">
            <p className="max-w-[38ch] text-[clamp(1.0625rem,1.3vw,1.25rem)] leading-[1.6] text-foreground">
              {t("hero.description")}
            </p>
          </HeroReveal>
          <HeroReveal
            delay={0.6}
            className="max-w-[62ch] space-y-4 text-base leading-relaxed text-muted-foreground lg:col-span-6 lg:col-start-7"
          >
            <p>{t.rich("intro.paragraph1", bodyMarks)}</p>
            <p>{t.rich("intro.paragraph2", bodyMarks)}</p>
          </HeroReveal>
        </div>
      </Container>
    </section>
  );
}
