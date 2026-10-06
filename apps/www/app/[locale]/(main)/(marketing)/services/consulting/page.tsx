import { JsonLd } from "@/components/seo/json-ld";
import { generateRouteMetadata, type RouteMetaKey } from "@/lib/metadata";
import { buildPageSchemas } from "@/lib/schema";
import { getPublicPricing } from "@/lib/server/pricing";
import {
  consultingView,
  publishedBuildRangeLabel,
  type Locale,
} from "@repo/pricing-schema";
import { serviceFaqSchemas } from "../_shared/service-faq-schema";
import PageClient from "./page-client";

const metaKey: RouteMetaKey = "serviceConsulting";
const pathSuffix = "/services/consulting";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  return generateRouteMetadata(locale, metaKey, pathSuffix);
}

export default async function ConsultingServicePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;

  const pricing = await getPublicPricing();
  const audit = consultingView("technical-audit", locale as Locale, pricing);
  const buildRange = publishedBuildRangeLabel(locale as Locale, pricing);
  const faqSchemas = await serviceFaqSchemas(
    locale,
    "serviceDetails.consulting.seo.faq",
    pricing,
  );

  return (
    <>
      <JsonLd schemas={[...buildPageSchemas(locale, metaKey), ...faqSchemas]} />
      <PageClient audit={audit} buildRange={buildRange} />
    </>
  );
}
