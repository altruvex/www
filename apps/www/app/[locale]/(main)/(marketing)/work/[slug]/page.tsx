import { Container } from "@/components/shared/container";
import { Breadcrumbs } from "@/components/seo/breadcrumbs";
import { JsonLd } from "@/components/seo/json-ld";
import { getAllCaseStudies, getCaseStudyBySlug } from "@/lib/data/case-studies";
import { generateRouteMetadata } from "@/lib/metadata";
import {
  buildCaseStudyPageSchemas,
  getCaseStudyBreadcrumbTrail,
} from "@/lib/schema";
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { notFound } from "next/navigation";
import WorkCaseStudyPageClient from "./page-client";
import { toLocale } from "@/i18n/locale-meta";

// Unknown slugs 404 at routing, before the segment's loading boundary streams a 200.
export const dynamicParams = false;

export function generateStaticParams() {
  return getAllCaseStudies().map((cs) => ({ slug: cs.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}): Promise<Metadata> {
  const { locale, slug } = await params;
  const loc = toLocale(locale);
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
    title: cs.seoTitle?.[loc] ?? cs.name[loc],
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
      <Container className="pt-(--section-y-top)">
        <Breadcrumbs
          items={getCaseStudyBreadcrumbTrail(locale, cs)}
          className="mb-0"
        />
      </Container>
      <WorkCaseStudyPageClient locale={locale} slug={slug} />
    </>
  );
}
