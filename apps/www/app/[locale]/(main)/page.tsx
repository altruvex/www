import { HOME_FAQ_QUESTION_KEYS } from "@/components/sections/home-faq-keys";
import { HeroSectionServer } from "@/components/sections/hero-section.server";
import { TransparentByDesign } from "@/components/sections/transparent-by-design";
import { JsonLd } from "@/components/seo/json-ld";
import { generateRouteMetadata } from "@/lib/metadata";
import { buildFaqPageSchemas, buildPageSchemas } from "@/lib/schema";
import { getPublicPricing } from "@/lib/server/pricing";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { HomeClient } from "./home-client";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  return generateRouteMetadata(locale, "home", "");
}

export default async function Home({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const pricing = await getPublicPricing();
  const tFaq = await getTranslations({ locale, namespace: "faq" });
  const questions = tFaq.raw("questions") as Record<
    string,
    { answer?: string; question?: string }
  >;
  // Exactly the entries HomeFaqSection renders, from the same keys.
  const homeFaqEntries = HOME_FAQ_QUESTION_KEYS.flatMap((key) => {
    const entry = questions?.[key];
    return entry?.question && entry.answer
      ? [{ answer: entry.answer, question: entry.question }]
      : [];
  });

  return (
    <>
      <JsonLd
        schemas={[
          ...buildPageSchemas(locale, "home"),
          ...buildFaqPageSchemas(homeFaqEntries, locale, pricing),
        ]}
      />
      <HeroSectionServer locale={locale} />
      <HomeClient transparency={<TransparentByDesign locale={locale} />} />
    </>
  );
}
