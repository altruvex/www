import { Container } from "@/components/shared/container";
import { Eyebrow } from "@/components/ui/eyebrow";
import { JsonLd } from "@/components/seo/json-ld";
import { generateRouteMetadata, type RouteMetaKey } from "@/lib/metadata";
import { buildFaqPageSchemas, buildPageSchemas } from "@/lib/schema";
import { getTranslations } from "next-intl/server";
import PageClient from "./page-client";

const metaKey: RouteMetaKey = "transparency";
const pathSuffix = "/transparency";

type TransparencySeoSection = {
  body: string;
  points: string[];
  title: string;
};

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  return generateRouteMetadata(locale, metaKey, pathSuffix);
}

export default async function TransparencyPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "transparency.faq" });
  const seo = await getTranslations({ locale, namespace: "transparency.seo" });
  const faqEntries = ["1", "2", "3", "4"].map((key) => ({
    answer: t.raw(`a${key}`) as string,
    question: t(`q${key}`),
  }));
  const sections = seo.raw("sections") as TransparencySeoSection[];

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
            <div className="grid gap-10 md:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)] md:gap-16">
              <div>
                <Eyebrow className="mb-4">{seo("eyebrow")}</Eyebrow>
                <h2 className="max-w-[13ch] font-sans text-4xl font-normal leading-tight text-primary md:text-5xl">
                  {seo("title")}
                </h2>
                <p className="mt-6 max-w-[58ch] text-base leading-relaxed text-primary/65">
                  {seo("body")}
                </p>
              </div>
              <div className="grid gap-6">
                {sections.map((section) => (
                  <article
                    key={section.title}
                    className="border border-foreground/8 p-6"
                  >
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
          </div>
        </Container>
      </section>
    </>
  );
}
