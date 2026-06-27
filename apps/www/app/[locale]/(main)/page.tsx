import { HeroSectionServer } from "@/components/sections/hero-section.server";
import { JsonLd } from "@/components/seo/json-ld";
import { getAllTestimonials } from "@/lib/data/testimonials";
import { generateRouteMetadata } from "@/lib/metadata";
import { buildPageSchemas, buildTestimonialReviewSchemas } from "@/lib/schema";
import { setRequestLocale } from "next-intl/server";
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

  return (
    <>
      <JsonLd
        schemas={[
          ...buildPageSchemas(locale, "home"),
          ...buildTestimonialReviewSchemas(locale, getAllTestimonials()),
        ]}
      />
      <HeroSectionServer locale={locale} />
      <HomeClient />
    </>
  );
}
