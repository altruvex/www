import { JsonLd } from "@/components/seo/json-ld";
import { generateRouteMetadata, type RouteMetaKey } from "@/lib/metadata";
import { buildPageSchemas } from "@/lib/schema";
import { getPublicPricing } from "@/lib/server/pricing";
import { maintenanceViews, type Locale } from "@repo/pricing-schema";
import PageClient from "./page-client";

const metaKey: RouteMetaKey = "serviceMaintenance";
const pathSuffix = "/services/maintenance";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  return generateRouteMetadata(locale, metaKey, pathSuffix);
}

export default async function MaintenanceServicePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const plans = maintenanceViews(locale as Locale, await getPublicPricing());

  return (
    <>
      <JsonLd schemas={buildPageSchemas(locale, metaKey)} />
      <PageClient plans={plans} />
    </>
  );
}
