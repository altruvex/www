import { Container } from "@/components/shared/container";
import { Eyebrow } from "@/components/ui/eyebrow";
import { JsonLd } from "@/components/seo/json-ld";
import { generateRouteMetadata, type RouteMetaKey } from "@/lib/metadata";
import { buildFaqPageSchemas, buildPageSchemas } from "@/lib/schema";
import { getTranslations } from "next-intl/server";
import PageClient from "./page-client";

const metaKey: RouteMetaKey = "schedule";
const pathSuffix = "/schedule";

type ScheduleSeoSection = {
  body: string;
  points: string[];
  title: string;
};

type ScheduleSeoFaq = {
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

export default async function SchedulePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "schedule.seo" });
  const sections = t.raw("sections") as ScheduleSeoSection[];
  const faqItems = t.raw("faq.items") as ScheduleSeoFaq[];
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
      <section className="border-t border-foreground/8 bg-background pt-(--section-y-top) pb-(--section-y-bottom)">
        <Container>
          <div className="mx-auto max-w-5xl">
            <div className="grid gap-10 md:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] md:gap-16">
              <div>
                <Eyebrow className="mb-4">{t("eyebrow")}</Eyebrow>
                <h2 className="max-w-[12ch] font-sans text-4xl font-normal leading-tight text-primary md:text-5xl">
                  {t("title")}
                </h2>
                <p className="mt-6 max-w-[58ch] text-base leading-relaxed text-primary/65">
                  {t("body")}
                </p>
              </div>
              <div className="divide-y divide-foreground/8 border-y border-foreground/8">
                {sections.map((section) => (
                  <article key={section.title} className="py-7 first:pt-0 last:pb-0">
                    <h3 className="font-sans text-2xl font-normal leading-snug text-primary">
                      {section.title}
                    </h3>
                    <p className="mt-3 text-base leading-relaxed text-primary/65">
                      {section.body}
                    </p>
                    <ul className="mt-5 grid gap-3 text-sm leading-relaxed text-primary/55 sm:grid-cols-2">
                      {section.points.map((point) => (
                        <li key={point} className="flex gap-3">
                          <span
                            aria-hidden
                            className="mt-2 h-px w-4 shrink-0 bg-primary/25"
                          />
                          <span>{point}</span>
                        </li>
                      ))}
                    </ul>
                  </article>
                ))}
              </div>
            </div>
            <div className="mt-16 border-t border-foreground/8 pt-10">
              <h2 className="font-sans text-3xl font-normal leading-tight text-primary">
                {t("faq.title")}
              </h2>
              <div className="mt-8 grid gap-8 md:grid-cols-2">
                {faqItems.map((item) => (
                  <article key={item.q}>
                    <h3 className="text-lg font-medium leading-snug text-primary">
                      {item.q}
                    </h3>
                    <p className="mt-3 text-base leading-relaxed text-primary/65">
                      {item.a}
                    </p>
                  </article>
                ))}
              </div>
            </div>
          </div>
        </Container>
      </section>
    </>
  );
}
