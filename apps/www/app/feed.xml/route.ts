import {
  getLocalizedUrl,
  SITE_CONFIG,
  SUPPORTED_LOCALES,
} from "@/lib/metadata";
import { getAllArticles } from "@/lib/utils/mdx";
import { NextResponse } from "next/server";

export const revalidate = 86400;

function escapeXml(value: string) {
  return value.replace(/[<>&'"]/g, (char) => {
    switch (char) {
      case "<":
        return "&lt;";
      case ">":
        return "&gt;";
      case "&":
        return "&amp;";
      case "'":
        return "&apos;";
      case '"':
        return "&quot;";
      default:
        return char;
    }
  });
}

function formatRssDate(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? new Date().toUTCString()
    : date.toUTCString();
}

export async function GET() {
  const articlesByLocale = await Promise.all(
    SUPPORTED_LOCALES.map(async (locale) => ({
      articles: await getAllArticles(locale),
      locale,
    })),
  );

  const items = articlesByLocale
    .flatMap(({ articles, locale }) =>
      articles.map((article) => ({
        ...article,
        locale,
      })),
    )
    .sort(
      (a, b) =>
        new Date(b.frontmatter.date).getTime() -
        new Date(a.frontmatter.date).getTime(),
    );

  const feedUrl = `${SITE_CONFIG.url}/feed.xml`;
  const latestDate = items[0]?.frontmatter.date ?? new Date().toISOString();
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom" xmlns:dc="http://purl.org/dc/elements/1.1/">
  <channel>
    <title>${escapeXml(SITE_CONFIG.name)} Writing</title>
    <link>${escapeXml(getLocalizedUrl(SITE_CONFIG.defaultLocale, "/writing"))}</link>
    <description>${escapeXml(SITE_CONFIG.description.en)}</description>
    <language>en</language>
    <lastBuildDate>${formatRssDate(latestDate)}</lastBuildDate>
    <atom:link href="${escapeXml(feedUrl)}" rel="self" type="application/rss+xml" />
${items
  .map((article) => {
    const url = getLocalizedUrl(article.locale, `/writing/${article.slug}`);

    return `    <item>
      <title>${escapeXml(article.frontmatter.title)}</title>
      <link>${escapeXml(url)}</link>
      <guid isPermaLink="true">${escapeXml(url)}</guid>
      <description>${escapeXml(article.frontmatter.excerpt)}</description>
      <pubDate>${formatRssDate(article.frontmatter.date)}</pubDate>
      <dc:creator>${escapeXml(article.frontmatter.author.trim() || SITE_CONFIG.name)}</dc:creator>
      <dc:language>${article.locale}</dc:language>
${article.frontmatter.tags
  .map((tag) => `      <category>${escapeXml(tag)}</category>`)
  .join("\n")}
    </item>`;
  })
  .join("\n")}
  </channel>
</rss>`;

  return new NextResponse(xml, {
    headers: {
      "Cache-Control": "public, max-age=3600, s-maxage=86400",
      "Content-Type": "application/rss+xml; charset=utf-8",
    },
  });
}
