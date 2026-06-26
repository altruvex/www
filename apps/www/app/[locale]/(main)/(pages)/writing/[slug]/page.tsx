import { Container } from "@/components/shared/container";
import { Breadcrumbs } from "@/components/seo/breadcrumbs";
import { JsonLd } from "@/components/seo/json-ld";
import { Eyebrow } from "@/components/ui/eyebrow";
import { mdxComponents } from "@/components/mdx/mdx-components";
import { Link } from "@/i18n/navigation";
import { generateRouteMetadata } from "@/lib/metadata";
import { buildArticlePageSchemas, getArticleBreadcrumbTrail } from "@/lib/schema";
import { getAllArticles, getArticle, getRelatedArticles } from "@/lib/utils/mdx";
import { MDXRemote } from "next-mdx-remote/rsc";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";

const ARTICLE_CTA_MAP: Record<string, { href: string }> = {
  "why-not-wordpress": { href: "/pricing?tier=professional" },
  "technical-debt": { href: "/services/maintenance" },
  "evaluating-developers": { href: "/services/consulting" },
  "multilingual-architecture": { href: "/services/development" },
};

interface ArticlePageProps {
  params: Promise<{ slug: string; locale: "en" | "ar" }>;
}

export async function generateStaticParams() {
  const en = (await getAllArticles("en")).map((a) => ({
    locale: "en" as const,
    slug: a.slug,
  }));
  const ar = (await getAllArticles("ar")).map((a) => ({
    locale: "ar" as const,
    slug: a.slug,
  }));
  return [...en, ...ar];
}

export async function generateMetadata({
  params,
}: ArticlePageProps): Promise<Metadata> {
  const { slug, locale } = await params;
  const article = await getArticle(slug, locale);
  const t = await getTranslations({ locale, namespace: "writing" });

  if (!article) {
    return generateRouteMetadata(locale, "writing", `/writing/${slug}`, {
      title: t("notFound.title"),
      description: t("notFound.body"),
    });
  }
  return generateRouteMetadata(locale, "writing", `/writing/${slug}`, {
    keywords: article.frontmatter.tags,
    openGraphType: "article",
    publishedTime: article.frontmatter.date,
    title: article.frontmatter.title,
    description: article.frontmatter.excerpt,
  });
}

export default async function ArticlePage({ params }: ArticlePageProps) {
  const { slug, locale } = await params;
  const article = await getArticle(slug, locale);
  if (!article) notFound();

  const t = await getTranslations({ locale, namespace: "writing" });
  const related = await getRelatedArticles(
    slug,
    article.frontmatter.tags,
    locale,
  );
  const ctaConfig = ARTICLE_CTA_MAP[slug] ?? null;

  return (
    <>
      <JsonLd schemas={buildArticlePageSchemas(locale, article)} />
      <div className="min-h-screen pt-24 md:pt-32">
        <Container>
          <Breadcrumbs items={getArticleBreadcrumbTrail(locale, article)} />
          <Link
            href="/writing"
            className="group inline-flex items-center gap-2 text-muted-foreground transition-colors duration-300 hover:text-foreground eyebrow mb-12"
          >
            <svg
              className="h-3.5 w-3.5 transition-transform duration-300 ltr:group-hover:-translate-x-0.5"
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
            {t("backLink")}
          </Link>
          <article>
            <header className="mb-16 md:mb-20 max-w-4xl">
              <div className="flex items-center gap-4 mb-6">
                <time
                  dateTime={article.frontmatter.date}
                  className="eyebrow text-muted-foreground"
                >
                  {new Date(article.frontmatter.date).toLocaleDateString(
                    locale,
                    {
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                    },
                  )}
                </time>
                <span className="text-primary/20">·</span>
                <Eyebrow>{article.frontmatter.readTime}</Eyebrow>
              </div>

              <h1
                className="mb-6 font-sans font-normal text-primary leading-[1.03]"
                style={{
                  fontSize: "clamp(36px, 6vw, 72px)",
                  letterSpacing: "-0.025em",
                }}
              >
                {article.frontmatter.title}
              </h1>
              <p className="text-base text-primary/60 leading-relaxed max-w-[52ch]">
                {article.frontmatter.excerpt}
              </p>
              <div className="mt-6 flex flex-wrap gap-2">
                {article.frontmatter.tags.map((tag) => (
                  <span
                    key={tag}
                    className="border border-foreground/8 bg-foreground/2 rounded-full px-3 py-1 eyebrow text-foreground/35"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </header>
            <div className="h-px w-full bg-foreground/8 mb-12 md:mb-16" />
            <div
              className="prose prose-lg max-w-3xl dark:prose-invert
            prose-headings:font-sans prose-headings:font-normal prose-headings:tracking-tight
            prose-p:text-primary/60 prose-p:leading-relaxed
            prose-a:text-primary prose-a:no-underline hover:prose-a:text-primary/70
            prose-code:font-mono text-sm leading-normal tracking-wider prose-code:text-sm
            prose-blockquote:border-foreground/8 prose-blockquote:text-primary/60
          "
            >
              <MDXRemote source={article.content} components={mdxComponents} />
            </div>
          </article>
          {ctaConfig && (
            <section className="mt-16 border-t border-foreground/8 pt-10">
              <Eyebrow className="mb-4 block">{t("nextStep")}</Eyebrow>
              <Link
                href={ctaConfig.href}
                className="group inline-flex items-center gap-2 text-muted-foreground transition-colors duration-300 hover:text-foreground eyebrow"
              >
                {t(`ctas.${slug}`)}
                <svg
                  className="h-3.5 w-3.5 transition-transform duration-300 ltr:group-hover:translate-x-0.5 rtl:group-hover:-translate-x-0.5 rtl:-rotate-180"
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
              </Link>
            </section>
          )}
          {related.length > 0 && (
            <section className="mt-20 md:mt-32 border-t border-foreground/8 pt-12 md:pt-16">
              <Eyebrow className="mb-4 block">{t("relatedArticles")}</Eyebrow>
              <h2
                className="font-sans font-normal text-primary leading-[1.05] mb-10"
                style={{
                  fontSize: "clamp(24px, 3.5vw, 40px)",
                  letterSpacing: "-0.02em",
                }}
              >
                {t("keepReading")}
              </h2>
              <div className="grid gap-4 md:grid-cols-3">
                {related.map((rel) => (
                  <Link
                    key={rel.slug}
                    href={`/writing/${rel.slug}`}
                    className="group border border-foreground/8 rounded-lg bg-foreground/2 p-6 hover:bg-foreground/4 transition-colors duration-300"
                  >
                    <h3
                      className="font-sans font-medium text-primary mb-2 group-hover:text-primary/70 transition-colors duration-300"
                      style={{
                        fontSize: "clamp(15px, 1.5vw, 18px)",
                        letterSpacing: "-0.01em",
                      }}
                    >
                      {rel.frontmatter.title}
                    </h3>
                    <p className="text-sm text-primary/60 leading-relaxed">
                      {rel.frontmatter.excerpt}
                    </p>
                  </Link>
                ))}
              </div>
            </section>
          )}
          <footer className="mb-20 mt-16 border-t border-foreground/8 pt-10">
            <Link
              href="/writing"
              className="group inline-flex items-center gap-2 text-muted-foreground transition-colors duration-300 hover:text-foreground eyebrow"
            >
              <svg
                className="h-3.5 w-3.5 transition-transform duration-300 ltr:group-hover:-translate-x-0.5"
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
              {t("backLink")}
            </Link>
          </footer>
        </Container>
      </div>
    </>
  );
}
