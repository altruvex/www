import { localizeNumbers } from "@/lib/utils/number";
import { ArrowIcon } from "@/components/shared/directional-link";
import { Container } from "@/components/shared/container";
import { Breadcrumbs } from "@/components/seo/breadcrumbs";
import { JsonLd } from "@/components/seo/json-ld";
import { Eyebrow } from "@/components/ui/eyebrow";
import { mdxComponents } from "@/components/mdx/mdx-components";
import { AuditLeadCapture } from "@/components/sections/audit-lead-capture";
import { SectionEndCta } from "@/components/sections/section-end-cta";
import { Link } from "@/i18n/navigation";
import { generateRouteMetadata } from "@/lib/metadata";
import { buildArticlePageSchemas, getArticleBreadcrumbTrail } from "@/lib/schema";
import { getAllArticles, getArticle, getRelatedArticles } from "@/lib/utils/mdx";
import { MDXRemote } from "next-mdx-remote/rsc";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { ArticleReader } from "./article-reader";

const ARTICLE_CTA_MAP: Record<string, { href: string }> = {
  "why-not-wordpress": { href: "/pricing" },
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
  const tEnd = await getTranslations({
    locale,
    namespace: "common.endCta.pages.writing",
  });
  const all = await getAllArticles(locale);
  const related = await getRelatedArticles(
    slug,
    article.frontmatter.tags,
    locale,
  );
  const ctaConfig = ARTICLE_CTA_MAP[slug] ?? null;

  const index = all.findIndex((a) => a.slug === slug);
  const next = all.length > 1 ? all[(index + 1) % all.length] : null;

  const taken = new Set([slug, next?.slug]);
  const keepReading = [
    ...all.filter((a) => a.frontmatter.topic === article.frontmatter.topic),
    ...related,
  ]
    .filter((a) => !taken.has(a.slug) && (taken.add(a.slug), true))
    .slice(0, 2);

  const readTime = (minutes: number) =>
    t("readTime", {
      count: minutes,
      minutes: localizeNumbers(String(minutes), locale),
    });

  return (
    <>
      <JsonLd schemas={buildArticlePageSchemas(locale, article)} />
      <div className="min-h-screen pt-(--section-y-top)">
        <Container>
          <Breadcrumbs
            items={getArticleBreadcrumbTrail(locale, article)}
            className="mb-10 md:mb-12"
          />
          <article>
            <header className="max-w-245">
              <p className="flex flex-wrap items-center gap-2.5 text-sm text-muted-foreground">
                <time dateTime={article.frontmatter.date}>
                  {new Date(article.frontmatter.date).toLocaleDateString(
                    locale === "ar" ? "ar-EG-u-nu-latn" : "en-US",
                    {
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                    },
                  )}
                </time>
                <span aria-hidden>·</span>
                <span>{readTime(article.frontmatter.readTimeMinutes)}</span>
              </p>

              <h1 className="mt-5.5 max-w-[18ch] font-sans font-normal text-[clamp(38px,5.8vw,84px)] leading-[1.03] tracking-[-0.025em] text-foreground rtl:leading-[1.3] rtl:tracking-normal">
                {article.frontmatter.title}
              </h1>
              <p className="mt-6.5 max-w-[56ch] text-[clamp(18px,1.5vw,21px)] leading-normal text-muted-foreground">
                {article.frontmatter.excerpt}
              </p>
              <div className="mt-6.5 flex flex-wrap gap-1.5">
                {article.frontmatter.tags.map((tag) => (
                  <span
                    key={tag}
                    className="rounded-full border border-border-subtle px-3 py-1 text-xs text-muted-foreground"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </header>

            <ArticleReader
              headings={article.headings}
              readTimeMinutes={article.frontmatter.readTimeMinutes}
              proseClassName="prose prose-lg max-w-3xl dark:prose-invert
            prose-headings:font-sans prose-headings:font-normal prose-headings:tracking-tight
            prose-h2:scroll-mt-24
            prose-p:text-primary/60 prose-p:leading-relaxed
            prose-a:text-primary prose-a:no-underline hover:prose-a:text-primary/70
            prose-code:text-sm
            prose-blockquote:border-border-subtle prose-blockquote:text-primary/60"
            >
              <MDXRemote source={article.content} components={mdxComponents} />
            </ArticleReader>

            <AuditLeadCapture
              source={`article_audit_cta:${slug}`}
              className="mt-(--section-block) max-w-3xl"
            />
          </article>

          {ctaConfig && (
            <section className="mt-(--section-block) border-t border-border-subtle pt-10">
              <Eyebrow className="mb-4 block">{t("nextStep")}</Eyebrow>
              <Link
                href={ctaConfig.href}
                className="group inline-flex items-center gap-2 text-muted-foreground transition-all duration-(--motion-drawer) hover:text-foreground eyebrow"
              >
                {t(`ctas.${slug}`)}
                <ArrowIcon className="h-3.5 w-3.5" />
              </Link>
            </section>
          )}

          {next && (
            <Link
              href={`/writing/${next.slug}`}
              className="group mt-[clamp(96px,14vh,160px)] grid grid-cols-[1fr_auto] items-end gap-x-8 gap-y-2 border-t-2 border-foreground pt-6"
            >
              <Eyebrow className="col-span-2">
                {t("article.nextArticle")} ·{" "}
                {readTime(next.frontmatter.readTimeMinutes)}
              </Eyebrow>
              <h2 className="max-w-[20ch] font-sans font-normal text-[clamp(30px,4.4vw,64px)] leading-[1.05] tracking-[-0.02em] text-foreground transition-colors duration-(--motion-drawer) ease-smooth group-hover:text-brand-text rtl:leading-[1.35] rtl:tracking-normal">
                {next.frontmatter.title}
              </h2>
              <ArrowIcon
                strokeWidth={1.5}
                className="size-[clamp(30px,4vw,56px)] ltr:group-hover:translate-x-2 rtl:group-hover:-translate-x-2"
              />
            </Link>
          )}

          {keepReading.length > 0 && (
            <section className="mt-14">
              <Eyebrow>{t("keepReading")}</Eyebrow>
              <ul className="mt-2 grid md:grid-cols-2 md:gap-x-12">
                {keepReading.map((rel) => (
                  <li key={rel.slug}>
                    <Link
                      href={`/writing/${rel.slug}`}
                      className="group flex items-baseline justify-between gap-4 border-b border-border-subtle py-4 text-lg"
                    >
                      <span className="text-foreground transition-colors duration-(--motion-drawer) ease-smooth group-hover:text-brand-text">
                        {rel.frontmatter.title}
                      </span>
                      <span className="shrink-0 text-[0.8125rem] whitespace-nowrap text-muted-foreground">
                        {readTime(rel.frontmatter.readTimeMinutes)}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          )}

          <footer className="mt-12 mb-(--section-y-bottom)">
            <Link
              href="/writing"
              className="group inline-flex items-center gap-2 text-sm text-muted-foreground transition-colors duration-(--motion-drawer) hover:text-foreground"
            >
              <ArrowIcon direction="back" className="h-3.5 w-3.5" />
              {t("backLink")}
            </Link>
          </footer>
        </Container>
        <SectionEndCta
          title={tEnd("title")}
          titleAccent={tEnd("titleAccent")}
          body={tEnd("body")}
          primary="projectRange"
          secondary="technicalAudit"
        />
      </div>
    </>
  );
}
