"use client";
import { useSectionTitle, useSectionEyebrow, useSectionDescription, useSectionCardGrid } from "@/lib/motion";

import { Container } from "@/components/container";
import { SectionEndCta } from "@/components/sections/section-end-cta";
import { Link } from "@/i18n/navigation";
import type { ArticleListItem } from "@/types/mdx";
import { useTranslations } from "next-intl";

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
      <ListSection articles={articles} locale={locale} />
      <SectionEndCta variant="transparency" />
    </div>
  );
}

function OpeningSection() {
  const t = useTranslations("writing");
  const eyebrowRef = useSectionEyebrow();
  const titleRef = useSectionTitle();
  const descRef = useSectionDescription();

  return (
    <section className="relative z-10 flex lg:min-h-screen w-full flex-col justify-end overflow-hidden pt-(--section-y-top) pb-(--section-y-bottom)">
      <Container>
        <div className="sm:max-w-5xl max-w-full">
          <p
            ref={eyebrowRef}
            className="font-mono text-sm leading-normal tracking-wider  uppercase rtl:font-sans rtl:normal-case rtl:tracking-normal text-muted-foreground/70 mb-6 block"
          >
            {t("eyebrow")}
          </p>
          <h1
            ref={titleRef}
            className="text-[clamp(3rem,5vw,4.5rem)] leading-[1.02] tracking-[-0.03em] mb-8 font-sans font-light text-foreground select-none"
          >
            {t("hero.title")}
            <br />
            <span className="font-serif italic font-light rtl:font-sans rtl:not-italic rtl:font-bold text-foreground/45">
              {t("hero.titleItalic")}
            </span>
          </h1>
          <div className="grid md:grid-cols-[80px_1fr] gap-8 items-start">
            <div className="h-px w-full bg-foreground/8 mt-3 hidden md:block" />
            <p
              ref={descRef}
              className="text-base text-primary/60 leading-relaxed max-w-[52ch]"
            >
              {t("hero.description")}
            </p>
          </div>
        </div>
      </Container>
    </section>
  );
}

function ListSection({ articles, locale }: WritingPageClientProps) {
  const sectionRef = useSectionCardGrid<HTMLElement>({ selector: "[data-article]" });

  return (
    <section
      ref={sectionRef}
      className="pt-(--section-y-top) pb-(--section-y-bottom) border-t border-foreground/8"
    >
      <Container>
        <div className="h-px w-full bg-foreground/8 mb-0" />
        <div>
          {articles.map((article, i) => (
            <Link
              key={article.slug}
              href={`/writing/${article.slug}`}
              data-article
              className="group block border-b border-foreground/8 py-8 md:py-10 overflow-hidden relative cursor-pointer px-4"
            >
              <div
                aria-hidden
                className="absolute inset-0 bg-foreground/2 pointer-events-none origin-left scale-x-0 group-hover:scale-x-100 transition-transform duration-300 ease-out"
              />
              <div className="relative z-10 grid gap-6 md:grid-cols-[56px_1fr_auto] items-start">
                <span
                  className="font-mono text-sm leading-normal tracking-wider font-light text-primary/20 group-hover:text-primary/50 transition-colors duration-300 pt-1"
                  style={{
                    fontSize: "clamp(16px, 1.5vw, 20px)",
                    letterSpacing: "-0.02em",
                  }}
                >
                  {String(i + 1).padStart(2, "0")}
                </span>
                <div>
                  <h2
                    className="font-sans font-medium text-primary mb-2 group-hover:translate-x-1.5 transition-transform duration-300"
                    style={{
                      fontSize: "clamp(17px, 2vw, 22px)",
                      letterSpacing: "-0.015em",
                    }}
                  >
                    {article.frontmatter.title}
                  </h2>
                  <p className="text-base text-primary/60 leading-relaxed max-w-[52ch]">
                    {article.frontmatter.excerpt}
                  </p>
                </div>
                <div className="flex items-center gap-3 font-mono text-sm leading-normal tracking-wider uppercase text-muted-foreground/70 shrink-0 pt-1">
                  <span>
                    {new Date(article.frontmatter.date).toLocaleDateString(
                      locale,
                      {
                        year: "numeric",
                        month: "long",
                      },
                    )}
                  </span>
                  <span>·</span>
                  <span>{article.frontmatter.readTime}</span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </Container>
    </section>
  );
}
