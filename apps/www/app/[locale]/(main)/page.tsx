import { HeroSectionServer } from "@/components/sections/hero-section.server";
import { TransparentByDesign } from "@/components/sections/transparent-by-design";
import { JsonLd } from "@/components/seo/json-ld";
import { getAllTestimonials } from "@/lib/data/testimonials";
import { generateRouteMetadata } from "@/lib/metadata";
import { buildPageSchemas, buildTestimonialReviewSchemas } from "@/lib/schema";
import { getPublicPricing } from "@/lib/server/pricing";
import {
  paymentScheduleView,
  workedExampleView,
  type Locale,
} from "@repo/pricing-schema";
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
  const pricing = await getPublicPricing();
  const paymentSplit = paymentScheduleView(
    locale as Locale,
    pricing,
  ).milestones.map((milestone) => milestone.percent);
  const scopeFigure = workedExampleView(locale as Locale, pricing).estimateLabel;

  return (
    <>
      <JsonLd
        schemas={[
          ...buildPageSchemas(locale, "home"),
          ...buildTestimonialReviewSchemas(locale, getAllTestimonials()),
        ]}
      />
      <HeroSectionServer locale={locale} />
      <HomeClient
        transparency={<TransparentByDesign locale={locale} />}
        paymentSplit={paymentSplit}
        scopeFigure={scopeFigure}
      />
    </>
  );
}
