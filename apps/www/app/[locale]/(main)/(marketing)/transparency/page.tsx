import { TransparencyMeasuresDetailsSection } from "@/components/sections/transparency-measures-details-section";
import { JsonLd } from "@/components/seo/json-ld";
import { generateRouteMetadata, type RouteMetaKey } from "@/lib/metadata";
import { buildFaqPageSchemas, buildPageSchemas } from "@/lib/schema";
import { getPublicPricing } from "@/lib/server/pricing";
import { publicAddonViews, termsView, type Locale } from "@repo/pricing-schema";
import { getTranslations } from "next-intl/server";
import PageClient from "./page-client";

const metaKey: RouteMetaKey = "transparency";
const pathSuffix = "/transparency";


export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  return generateRouteMetadata(locale, metaKey, pathSuffix);
}

export default async function TransparencyPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const pricing = await getPublicPricing();
  const terms = termsView(locale as Locale, pricing);
  const addons = publicAddonViews(locale as Locale, pricing);

  const t = await getTranslations({ locale, namespace: "transparency.faq" });
  const faqEntries = ["1", "2", "3", "4"].map((key) => ({
    answer: t.raw(`a${key}`) as string,
    question: t(`q${key}`),
  }));

  return (
    <>
      <JsonLd
        schemas={[
          ...buildPageSchemas(locale, metaKey),
          ...buildFaqPageSchemas(faqEntries, locale, pricing),
        ]}
      />
      <PageClient terms={terms} addons={addons} />
      <TransparencyMeasuresDetailsSection />
    </>
  );
}
