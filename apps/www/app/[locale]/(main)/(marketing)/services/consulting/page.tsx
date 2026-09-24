import { ConsultingFaqSection } from "@/components/sections/technical-section";
import { JsonLd } from "@/components/seo/json-ld";
import { generateRouteMetadata, type RouteMetaKey } from "@/lib/metadata";
import { buildFaqPageSchemas, buildPageSchemas } from "@/lib/schema";
import { getPublicPricing } from "@/lib/server/pricing";
import {
  consultingView,
  publishedBuildRangeLabel,
  type Locale,
} from "@repo/pricing-schema";
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

  const pricing = await getPublicPricing();
  const audit = consultingView("technical-audit", locale as Locale, pricing);
  /* The span the audit's fee is stated against. Resolved here rather than in
     the client component so the figure and the audit price come from the same
     admin-editable matrix. */
  const buildRange = publishedBuildRangeLabel(locale as Locale, pricing);

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
          ...buildFaqPageSchemas(faqEntries, locale, pricing),
        ]}
      />
      <PageClient
        audit={audit}
        buildRange={buildRange}
        faq={<ConsultingFaqSection />}
      />
    </>
  );
}
