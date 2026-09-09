import { JsonLd } from "@/components/seo/json-ld";
import { generateRouteMetadata, type RouteMetaKey } from "@/lib/metadata";
import {
  buildFaqPageSchemas,
  buildPageSchemas,
  buildPricingOfferSchemas,
} from "@/lib/schema";
import {
  deliveryCeilingLabel,
  minimumEngagementLabel,
  tierViews,
  type Locale,
} from "@repo/pricing-schema";
import { getPublicPricing } from "@/lib/server/pricing";
import { getTranslations } from "next-intl/server";
import PageClient from "./page-client";

const metaKey: RouteMetaKey = "pricing";
const pathSuffix = "/pricing";
export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  return generateRouteMetadata(locale, metaKey, pathSuffix);
}

export default async function PricingPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "pricing" });
  const faqEntries = Object.values(
    t.raw("faq.questions") as Record<string, { a: string; q: string }>,
  ).map((entry) => ({
    answer: entry.a,
    question: entry.q,
  }));
  // Structured-data offers are built from the schema, not from message copy.
  // These become machine-readable Offer prices in search results, so a stale
  // string here publishes a wrong price to Google, not just to a visitor.
  // Resolved server-side so an admin price change reaches both the rendered
  // cards and the machine-readable offers, not just one of them.
  const pricing = await getPublicPricing();
  const tiers = tierViews(locale as Locale, pricing);
  const offerEntries = tiers.map((tier) => ({
    description: tier.idealFor,
    features: [...tier.features],
    name: tier.buyerLabel,
    price: tier.priceLabel,
  }));

  return (
    <>
      <JsonLd
        schemas={[
          ...buildPageSchemas(locale, metaKey),
          ...buildFaqPageSchemas(faqEntries, locale, pricing),
          ...buildPricingOfferSchemas(locale, offerEntries),
        ]}
      />
      <PageClient
        tiers={tiers}
        floorLabel={minimumEngagementLabel(locale as Locale, pricing)}
        ceilingLabel={deliveryCeilingLabel(locale as Locale)}
      />
    </>
  );
}
