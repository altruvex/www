import { JsonLd } from "@/components/seo/json-ld";
import { generateRouteMetadata, type RouteMetaKey } from "@/lib/metadata";
import { buildPageSchemas } from "@/lib/schema";
import { getPublicPricing } from "@/lib/server/pricing";
import { toLocale } from "@/i18n/locale-meta";
import { budgetOptionsView } from "@repo/pricing-schema";
import PageClient from "./page-client";

export const dynamic = "force-dynamic";

const metaKey: RouteMetaKey = "contact";
const pathSuffix = "/contact";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  return generateRouteMetadata(locale, metaKey, pathSuffix);
}

export default async function ContactPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  // Budget labels for the optional second step, from the live (overridable) floor.
  const budgetOptions = budgetOptionsView(
    toLocale(locale),
    await getPublicPricing(),
  ).map(({ id, label }) => ({ id, label }));

  return (
    <>
      <JsonLd schemas={buildPageSchemas(locale, metaKey)} />
      <PageClient budgetOptions={budgetOptions} />
    </>
  );
}