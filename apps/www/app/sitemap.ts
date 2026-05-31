import { getAllCaseStudies } from "@/lib/case-studies";
import { getLocalizedUrl, SUPPORTED_LOCALES } from "@/lib/metadata";
import { getAllArticles } from "@/lib/mdx";
import { MetadataRoute } from "next";

const STATIC_ROUTES = [
  "/",
  "/about",
  "/approach",
  "/contact",
  "/transparency",
  "/how-we-work",
  "/pricing",
  "/privacy",
  "/process",
  "/schedule",
  "/services",
  "/services/consulting",
  "/services/development",
  "/services/interface-design",
  "/services/maintenance",
  "/services/ecommerce",
  "/standards",
  "/terms",
  "/work",
  "/writing",
  "/offline",
] as const;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const currentDate = new Date();
  const caseStudies = getAllCaseStudies();
  const [enArticles, arArticles] = await Promise.all([
    getAllArticles("en"),
    getAllArticles("ar"),
  ]);

  const articlesByLocale = {
    ar: arArticles,
    en: enArticles,
  } as const;

  const sitemapEntries: MetadataRoute.Sitemap = [];
  const buildAlternates = (path: string) => ({
    languages: Object.fromEntries(
      SUPPORTED_LOCALES.map((locale) => [
        locale,
        getLocalizedUrl(locale, path),
      ]),
    ),
  });

  for (const locale of SUPPORTED_LOCALES) {
    for (const route of STATIC_ROUTES) {
      sitemapEntries.push({
        alternates: buildAlternates(route),
        changeFrequency:
          route === "/" || route === "/writing" ? "weekly" : "monthly",
        lastModified: currentDate,
        priority: route === "/" ? 1 : route.startsWith("/services") ? 0.9 : 0.8,
        url: getLocalizedUrl(locale, route),
      });
    }

    for (const caseStudy of caseStudies) {
      const caseStudyPath = `/work/${caseStudy.slug}`;
      sitemapEntries.push({
        alternates: buildAlternates(caseStudyPath),
        changeFrequency: "monthly",
        lastModified: new Date(`${caseStudy.year}-01-01`),
        priority: 0.85,
        url: getLocalizedUrl(locale, caseStudyPath),
      });
    }

    for (const article of articlesByLocale[locale]) {
      const articlePath = `/writing/${article.slug}`;
      sitemapEntries.push({
        alternates: buildAlternates(articlePath),
        changeFrequency: "monthly",
        lastModified: new Date(article.frontmatter.date),
        priority: 0.75,
        url: getLocalizedUrl(locale, articlePath),
      });
    }
  }

  return sitemapEntries;
}
