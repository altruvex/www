import { TechnicalSection } from "@/components/sections/technical-section";
import { JsonLd } from "@/components/seo/json-ld";
import { generateRouteMetadata, type RouteMetaKey } from "@/lib/metadata";
import { buildFaqPageSchemas, buildPageSchemas } from "@/lib/schema";
import { getTranslations } from "next-intl/server";
import PageClient from "./page-client";

const metaKey: RouteMetaKey = "serviceConsulting";
const pathSuffix = "/services/consulting";


type ConsultingSeoFaq = {
  a: string;
  q: string;
};

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
  const t = await getTranslations({
    locale,
    namespace: "serviceDetails.consulting.seo",
  });

  const faqItems = t.raw("faq.items") as ConsultingSeoFaq[];
  const faqEntries = faqItems.map((item) => ({
    answer: item.a,
    question: item.q,
  }));

  return (
    <>
      <JsonLd
        schemas={[
          ...buildPageSchemas(locale, metaKey),
          ...buildFaqPageSchemas(faqEntries),
        ]}
      />
      <PageClient />
      <TechnicalSection />
    </>
  );
}
