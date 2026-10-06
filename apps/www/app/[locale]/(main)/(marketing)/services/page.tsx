import { JsonLd } from "@/components/seo/json-ld";
import { generateRouteMetadata, type RouteMetaKey } from "@/lib/metadata";
import { buildPageSchemas } from "@/lib/schema";
import { getPublicPricing } from "@/lib/server/pricing";
import { serviceFaqSchemas } from "./_shared/service-faq-schema";
import PageClient from "./page-client";

const metaKey: RouteMetaKey = "services";
const pathSuffix = "/services";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  return generateRouteMetadata(locale, metaKey, pathSuffix);
}

export default async function ServicesPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const faqSchemas = await serviceFaqSchemas(
    locale,
    "servicesPage.faq",
    await getPublicPricing(),
  );

  return (
    <>
      <JsonLd schemas={[...buildPageSchemas(locale, metaKey), ...faqSchemas]} />
      <PageClient />
    </>
  );
}
