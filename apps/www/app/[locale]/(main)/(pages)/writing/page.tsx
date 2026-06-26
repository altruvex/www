import { JsonLd } from "@/components/seo/json-ld";
import { getAllArticles } from "@/lib/utils/mdx";
import { generateRouteMetadata, type RouteMetaKey } from "@/lib/metadata";
import { buildPageSchemas } from "@/lib/schema";
import PageClient from "./page-client";

const metaKey: RouteMetaKey = "writing";
const pathSuffix = "/writing";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  return generateRouteMetadata(locale, metaKey, pathSuffix);
}

export default async function WritingPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const articles = await getAllArticles(locale === "ar" ? "ar" : "en");

  return (
    <>
      <JsonLd schemas={buildPageSchemas(locale, metaKey)} />
      <PageClient articles={articles} locale={locale === "ar" ? "ar" : "en"} />
    </>
  );
}
