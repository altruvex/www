import { JsonLd } from "@/components/seo/json-ld";
import {
  generateRouteMetadata,
  normalizeLocale,
  PAGE_METADATA,
  type RouteMetaKey,
} from "@/lib/metadata";
import { buildPageSchemas } from "@/lib/schema";
import PageClient, { type RouteCard } from "./page-client";

const metaKey: RouteMetaKey = "about";
const pathSuffix = "/about";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  return generateRouteMetadata(locale, metaKey, pathSuffix);
}

export default async function AboutPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const loc = normalizeLocale(locale);

  const routeCards: RouteCard[] = [
    {
      description: PAGE_METADATA.services[loc].description,
      href: PAGE_METADATA.services.path,
      label: PAGE_METADATA.services[loc].breadcrumb,
      title: PAGE_METADATA.services[loc].title,
    },
    {
      description: PAGE_METADATA.work[loc].description,
      href: PAGE_METADATA.work.path,
      label: PAGE_METADATA.work[loc].breadcrumb,
      title: PAGE_METADATA.work[loc].title,
    },
    {
      description: PAGE_METADATA.pricing[loc].description,
      href: PAGE_METADATA.pricing.path,
      label: PAGE_METADATA.pricing[loc].breadcrumb,
      title: PAGE_METADATA.pricing[loc].title,
    },
    {
      description: PAGE_METADATA.schedule[loc].description,
      href: PAGE_METADATA.schedule.path,
      label: PAGE_METADATA.schedule[loc].breadcrumb,
      title: PAGE_METADATA.schedule[loc].title,
    },
  ];

  return (
    <>
      <JsonLd schemas={buildPageSchemas(locale, metaKey)} />
      <PageClient routeCards={routeCards} />
    </>
  );
}
