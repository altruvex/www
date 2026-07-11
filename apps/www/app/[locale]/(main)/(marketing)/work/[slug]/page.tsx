import { Container } from "@/components/shared/container";
import { Breadcrumbs } from "@/components/seo/breadcrumbs";
import { JsonLd } from "@/components/seo/json-ld";
import { getCaseStudyBySlug } from "@/lib/data/case-studies";
import { generateRouteMetadata } from "@/lib/metadata";
import {
  buildCaseStudyPageSchemas,
  getCaseStudyBreadcrumbTrail,
} from "@/lib/schema";
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { notFound } from "next/navigation";
import WorkCaseStudyPageClient from "./page-client";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}): Promise<Metadata> {
  const { locale, slug } = await params;
  const loc = locale === "ar" ? "ar" : "en";
  const cs = getCaseStudyBySlug(slug);
  const t = await getTranslations({ locale, namespace: "work.labels" });
  const pathSuffix = `/work/${slug}`;

  if (!cs) {
    return generateRouteMetadata(locale, "workCaseStudy", pathSuffix, {
      title: t("notFoundTitle"),
      description: t("notFoundBody"),
      robots: {
        follow: false,
        googleBot: {
          follow: false,
          index: false,
        },
        index: false,
      },
    });
  }
  return generateRouteMetadata(locale, "workCaseStudy", pathSuffix, {
    description: cs.summary[loc],
    keywords: [
      ...cs.keywords[loc],
      cs.client[loc],
      cs.industry[loc],
      t("caseStudy"),
    ],
    title: cs.name[loc],
  });
}

export default async function WorkCaseStudyPage({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { locale, slug } = await params;
  const cs = getCaseStudyBySlug(slug);

  if (!cs) {
    notFound();
  }

  return (
    <>
      <JsonLd schemas={buildCaseStudyPageSchemas(locale, cs)} />
      <Container className="pt-24 md:pt-32">
        <Breadcrumbs
          items={getCaseStudyBreadcrumbTrail(locale, cs)}
          className="mb-0"
        />
      </Container>
      <WorkCaseStudyPageClient locale={locale} slug={slug} />
    </>
  );
}
