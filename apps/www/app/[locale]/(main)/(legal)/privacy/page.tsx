import { JsonLd } from "@/components/seo/json-ld";
import { generateRouteMetadata } from "@/lib/metadata";
import { buildPageSchemas } from "@/lib/schema";
import PageClient from "./page-client";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  return generateRouteMetadata(locale, "privacy", "/privacy");
}

export default async function PrivacyPolicyPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;

  const dateLocale = locale === "ar" ? "ar-EG" : "en-US";
  const lastModified = new Date("2026-07-05");
  const formattedDate = lastModified.toLocaleDateString(dateLocale, {
    month: "long",
    day: "numeric",
    year: "numeric",
  });

  return (
    <>
      <JsonLd schemas={buildPageSchemas(locale, "privacy")} />
      <PageClient formattedDate={formattedDate} />
    </>
  );
}
