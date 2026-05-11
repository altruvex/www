import { setRequestLocale } from "next-intl/server";
import { generateRouteMetadata } from "@/lib/metadata";
import { HomeClient } from "./home-client";
import { HeroSectionServer } from "@/components/sections/hero-section.server";

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
      <HeroSectionServer locale={locale} />
      <HomeClient />
    </>
  );
}
