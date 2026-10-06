import { JsonLd } from "@/components/seo/json-ld";
import { generateRouteMetadata, type RouteMetaKey } from "@/lib/metadata";
import { buildPageSchemas } from "@/lib/schema";
import { getPublicPricing } from "@/lib/server/pricing";
import { serviceFaqSchemas } from "../_shared/service-faq-schema";
import { ServiceInvestmentLine } from "../_shared/service-investment-line";
import PageClient from "./page-client";

const metaKey: RouteMetaKey = "serviceDevelopment";
const pathSuffix = "/services/development";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  return generateRouteMetadata(locale, metaKey, pathSuffix);
}

export default async function DevelopmentServicePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const faqSchemas = await serviceFaqSchemas(
    locale,
    "serviceDetails.development.faq",
    await getPublicPricing(),
  );

  return (
    <>
      <JsonLd
        schemas={[
          ...buildPageSchemas(locale, metaKey),
          ...faqSchemas,
        ]}
      />
      <PageClient
        investment={<ServiceInvestmentLine serviceId="development" locale={locale} />}
      />
    </>
  );
}
