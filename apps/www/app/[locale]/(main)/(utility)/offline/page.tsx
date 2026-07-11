import { JsonLd } from "@/components/seo/json-ld";
import { generateRouteMetadata, type RouteMetaKey } from "@/lib/metadata";
import { buildPageSchemas } from "@/lib/schema";
import PageClient from "./page-client";

const metaKey: RouteMetaKey = "offline";
const pathSuffix = "/offline";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  return generateRouteMetadata(locale, metaKey, pathSuffix);
}

export default async function OfflinePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;

  return (
    <>
      <JsonLd schemas={buildPageSchemas(locale, metaKey)} />
      <PageClient />
    </>
  );
}
