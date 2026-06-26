import { JsonLd } from "@/components/seo/json-ld";
import { generateRouteMetadata, type RouteMetaKey } from "@/lib/metadata";
import { buildHowToPageSchemas, buildPageSchemas } from "@/lib/schema";
import { getTranslations } from "next-intl/server";
import PageClient from "./page-client";

const metaKey = "process" satisfies RouteMetaKey;
const pathSuffix = "/process";
const phaseKeys = [
  "discovery",
  "wireframe",
  "design",
  "development",
  "launch",
] as const;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  return generateRouteMetadata(locale, metaKey, pathSuffix);
}

export default async function ProcessPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "process.phases" });
  const howToSteps = phaseKeys.map((key) => ({
    deliverables: t(`${key}.deliverables`),
    name: t(`${key}.title`),
    text: t(`${key}.description`),
  }));

  return (
    <>
      <JsonLd
        schemas={[
          ...buildPageSchemas(locale, metaKey),
          ...buildHowToPageSchemas(locale, metaKey, howToSteps),
        ]}
      />
      <PageClient />
    </>
  );
}
