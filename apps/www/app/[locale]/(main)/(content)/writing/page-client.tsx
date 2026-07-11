"use client";
import { Container } from "@/components/shared/container";
import { PageHero } from "@/components/sections/page-hero";
import { SectionEndCta } from "@/components/sections/section-end-cta";
import { bodyMarks } from "@/components/ui/rich-text";
import { Link } from "@/i18n/navigation";
import { useSectionCardGrid, useSectionDescription } from "@/lib/motion";
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
      <IntroSection />
      <ListSection articles={articles} locale={locale} />
      <SectionEndCta variant="transparency" />
    </div>
  );
}

function OpeningSection() {
  const t = useTranslations("writing");

  return (
    <PageHero
      eyebrow={t("eyebrow")}
      title={t("hero.title")}
      titleItalic={t("hero.titleItalic")}
      description={t("hero.description")}
    />
  );
}

function IntroSection() {
  const t = useTranslations("writing.intro");
  const descRef = useSectionDescription<HTMLDivElement>();

  return (
    <section className="accent-world-blue pt-(--section-y-top) pb-0">
      <Container>
        <div
          ref={descRef}
          className="max-w-3xl space-y-5 text-base text-primary/60 leading-relaxed"
        >
          <p>{t.rich("paragraph1", bodyMarks)}</p>
          <p>{t.rich("paragraph2", bodyMarks)}</p>
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
      className="accent-world-blue pt-(--section-y-top) pb-(--section-y-bottom) border-t border-foreground/8"
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
                className="absolute inset-0 bg-foreground/2 pointer-events-none origin-left scale-x-0 group-hover:scale-x-100 group-focus-visible:scale-x-100 transition-all duration-300 ease-out rtl:origin-right"
              />
              <div className="relative z-10 grid gap-6 md:grid-cols-[56px_1fr_auto] items-start">
                <span
                  className="font-mono text-sm leading-normal tracking-wider font-light text-primary/20 group-hover:text-primary/50 transition-all duration-300 pt-1"
                  style={{
                    fontSize: "clamp(16px, 1.5vw, 20px)",
                    letterSpacing: "-0.02em",
                  }}
                >
                  {String(i + 1).padStart(2, "0")}
                </span>
                <div>
                  <h2
                    className="font-sans font-medium text-primary mb-2 transition-all duration-300 ltr:group-hover:translate-x-1.5 rtl:group-hover:-translate-x-1.5"
                    style={{
                      fontSize: "clamp(17px, 2vw, 22px)",
                      letterSpacing: "-0.015em",
                    }}
                  >
                    {article.frontmatter.title}
                  </h2>
                  <p className="text-base text-primary/60 leading-relaxed">
                    {article.frontmatter.excerpt}
                  </p>
                </div>
                <div className="flex items-center gap-3 font-mono text-sm leading-normal tracking-wider uppercase text-muted-foreground shrink-0 pt-1">
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
