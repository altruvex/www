import { JsonLd } from "@/components/seo/json-ld";
import { getAllArticles } from "@/lib/utils/mdx";
import { generateRouteMetadata, type RouteMetaKey } from "@/lib/metadata";
import { buildPageSchemas } from "@/lib/schema";
import PageClient from "./page-client";
import { toLocale } from "@/i18n/locale-meta";

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
  const loc = toLocale(locale);
  const articles = await getAllArticles(loc);

  return (
    <>
      <JsonLd schemas={buildPageSchemas(locale, metaKey)} />
      <PageClient articles={articles} locale={loc} />
    </>
  );
}
