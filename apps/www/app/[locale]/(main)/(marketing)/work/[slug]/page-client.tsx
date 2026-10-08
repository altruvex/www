"use client";

import { SectionEndCta } from "@/components/sections/section-end-cta";
import { DirectionalLink } from "@/components/shared/directional-link";
import { ArrowIcon } from "@repo/ui";
import { Container } from "@/components/shared/container";
import { Eyebrow } from "@repo/ui/www";
import { Num } from "@/components/ui/num";
import { bodyMarks } from "@/components/ui/rich-text";
import { Link } from "@/i18n/navigation";
import type { ServiceSlug } from "@/lib/config/accent-world";
import { getCommercialCta } from "@/lib/config/commercial";
import { CASE_STUDIES, getCaseStudyBySlug } from "@/lib/data/case-studies";
import { useSectionCardGrid, useSectionDescription, useSectionEyebrow, useSectionTitle } from "@/lib/motion";
import { getDomainName } from "@/lib/utils/utils";
import { useTranslations } from "next-intl";

/** Footer namespace already names every service; reuse it so labels stay single-sourced. */
const SERVICE_LABEL_KEY: Record<ServiceSlug, string> = {
  "interface-design": "webDesign",
  development: "development",
  consulting: "consulting",
  maintenance: "maintenance",
};

const GLANCE_KEYS = ["build", "languages", "platform", "status"] as const;

const GLANCE_LABEL: Record<(typeof GLANCE_KEYS)[number], string> = {
  build: "glanceBuild",
  languages: "glanceLanguages",
  platform: "glancePlatform",
  status: "glanceStatus",
};

const BODY = "max-w-[65ch] text-base text-s-mid leading-relaxed";
const SECTION_H2 =
  "font-sans font-normal text-primary leading-[1.05] tracking-[-0.015em] text-[clamp(20px,2.5vw,28px)] mb-4";

type WorkCaseStudyPageClientProps = {
  locale: string;
  slug: string;
};

export default function WorkCaseStudyPageClient({
  slug,
}: WorkCaseStudyPageClientProps) {
  const tLabels = useTranslations("work.labels");
  const tCS = useTranslations("caseStudies");
  const tFooter = useTranslations("footer");

  const eyebrowRef = useSectionEyebrow<HTMLParagraphElement>();
  const titleRef = useSectionTitle<HTMLHeadingElement>();
  const descRef = useSectionDescription<HTMLParagraphElement>();
  const glanceRef = useSectionCardGrid<HTMLDListElement>();

  let exists = false;
  try {
    exists = !!tCS(slug + ".name");
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  } catch (e) {
    exists = false;
  }

  if (!slug || !exists) {
    return (
      <section className="accent-world-orange pt-(--section-y-top) pb-(--section-y-bottom)">
        <Container>
          <div className="max-w-2xl">
            <Eyebrow ref={eyebrowRef} className="mb-4 block">{tLabels("caseStudy")}</Eyebrow>
            <h1
              ref={titleRef}
              className="font-sans font-normal text-primary leading-[1.05] tracking-[-0.02em] text-[clamp(28px,4.5vw,52px)] mb-4"
            >
              {tLabels("notFoundTitle")}
            </h1>
            <p ref={descRef} className="text-base text-s-mid leading-relaxed mb-8">
              {tLabels("notFoundBody")}
            </p>
            <Link
              href="/work"
              className="group inline-flex items-center gap-2 text-muted-foreground transition-all duration-(--motion-drawer) hover:text-foreground eyebrow"
            >
              <ArrowIcon direction="back" motion="none" className="h-3.5 w-3.5" />
              {tLabels("backLink")}
            </Link>
          </div>
        </Container>
      </section>
    );
  }

  const decisions = tCS.raw(slug + ".decisions") as Array<{
    title: string;
    why: string;
  }>;
  const delivered = tCS.raw(slug + ".delivered") as string[];
  const techStack = tCS.raw(slug + ".techStack") as string[];
  const csData = getCaseStudyBySlug(slug);
  const externalUrl = csData?.externalUrl;
  const services = csData?.services ?? [];

  return (
    <>
    <section className="accent-world-green pt-(--section-block) pb-(--section-y-bottom)">
      <Container>
        <div>
          <div className="mb-(--heading-gap)">
            <Eyebrow ref={eyebrowRef} className="mb-4 block">{tLabels("caseStudy")}</Eyebrow>
            <h1
              ref={titleRef}
              className="mb-4 font-sans font-normal text-primary leading-[1.03] tracking-tight text-[clamp(36px,6vw,72px)]"
            >
              {tCS(slug + ".name")}
            </h1>
            <p className="font-mono text-sm leading-normal tracking-wider uppercase text-s-low mb-5">
              {tCS(slug + ".client")} · {tCS(slug + ".industry")}
            </p>
            <p ref={descRef} className="max-w-[65ch] text-base text-s-mid leading-relaxed">
              {tCS(slug + ".summary")}
            </p>
            {externalUrl && (
              <a
                href={externalUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-5 inline-flex min-h-6 items-center gap-2 rounded-ctl-sm text-base text-foreground outline-none transition-colors duration-(--motion-drawer) ease-smooth hover:text-local-accent-text focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background pointer-coarse:min-h-11"
              >
                {tLabels.rich("visitSite", {
                  domain: () => (
                    <span dir="ltr" className="ltr:font-mono">
                      {getDomainName(externalUrl)}
                    </span>
                  ),
                })}
                <span aria-hidden>↗</span>
              </a>
            )}
          </div>
          <div className="mb-(--section-block)">
            <h2 className="sr-only">{tLabels("glance")}</h2>
            <dl ref={glanceRef} className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {GLANCE_KEYS.map((key) => (
                <div
                  key={key}
                  className="flex flex-col-reverse justify-end border-t border-border-subtle pt-5"
                >
                  <dt>
                    <Eyebrow tone="accent">{tLabels(GLANCE_LABEL[key])}</Eyebrow>
                  </dt>
                  <dd className="font-sans font-light text-local-accent-text leading-none tracking-[-0.03em] text-[clamp(28px,4vw,40px)] mb-3 rtl:leading-[1.3] rtl:tracking-normal">
                    <bdi>{tCS(`${slug}.glance.${key}`)}</bdi>
                  </dd>
                </div>
              ))}
            </dl>
          </div>
          <div className="grid gap-12 md:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
            <div className="space-y-12">
              {[
                { heading: tLabels("context"), content: tCS(slug + ".context") },
                { heading: tLabels("challenge"), content: tCS(slug + ".problem") },
                { heading: tLabels("approach"), content: tCS(slug + ".solution") },
              ].map(({ heading, content }) => (
                <section key={heading}>
                  <h2 className={SECTION_H2}>{heading}</h2>
                  <p className={BODY}>{content}</p>
                </section>
              ))}
              <section>
                <h2 className={SECTION_H2}>{tLabels("decisions")}</h2>
                <ol className="mt-6">
                  {decisions.map((decision, index) => (
                    <li
                      key={decision.title}
                      className="grid grid-cols-[3rem_minmax(0,1fr)] gap-4 border-t border-border-subtle py-5 md:grid-cols-[4rem_minmax(0,1fr)]"
                    >
                      <span className="pt-1 text-md text-muted-foreground tabular-nums">
                        <Num value={index + 1} pad={2} />
                      </span>
                      <div>
                        <h3 className="text-[clamp(1.125rem,1.6vw,1.375rem)] leading-snug tracking-[-0.015em] text-foreground rtl:tracking-normal">
                          {decision.title}
                        </h3>
                        <p className={`mt-2 ${BODY}`}>{decision.why}</p>
                      </div>
                    </li>
                  ))}
                </ol>
              </section>
              <section>
                <h2 className={SECTION_H2}>{tLabels("results")}</h2>
                <p className={BODY}>{tCS.rich(slug + ".outcome", bodyMarks)}</p>
              </section>
            </div>
            <aside className="space-y-8">
              <div className="border-t border-border-subtle pt-5">
                <h3 className="eyebrow text-s-low mb-4">
                  {tLabels("delivered")}
                </h3>
                <ul className="space-y-2.5">
                  {delivered.map((item) => (
                    <li
                      key={item}
                      className="flex items-center gap-3 text-sm text-s-mid"
                    >
                      <span aria-hidden className="h-1 w-1 rounded-full bg-local-accent shrink-0" />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
              {services.length > 0 && (
                <div className="border-t border-border-subtle pt-5">
                  <h3 className="eyebrow text-s-low mb-4">
                    {tLabels("services")}
                  </h3>
                  <ul className="space-y-2.5">
                    {services.map((service) => (
                      <li key={service}>
                        <DirectionalLink
                          href={`/services/${service}`}
                          className="rounded-ctl-sm text-sm text-s-mid transition-colors duration-(--motion-drawer) ease-smooth hover:text-local-accent-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                        >
                          {tFooter(SERVICE_LABEL_KEY[service])}
                        </DirectionalLink>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              <div className="border-t border-border-subtle pt-5">
                <h3 className="eyebrow text-s-low mb-4">
                  {tLabels("techStack")}
                </h3>
                <ul className="space-y-2.5">
                  {techStack.map((tech) => (
                    <li
                      key={tech}
                      className="flex items-center gap-3 text-sm text-s-mid"
                    >
                      <span aria-hidden className="h-1 w-1 rounded-full bg-local-accent shrink-0" />
                      {tech}
                    </li>
                  ))}
                </ul>
              </div>
              {externalUrl && (
                <div className="border-t border-border-subtle pt-5">
                  <h3 className="eyebrow text-s-low mb-4">
                    {tLabels("liveSite")}
                  </h3>
                  <a
                    href={externalUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group inline-flex items-center gap-2 font-mono text-sm leading-normal tracking-wider uppercase text-s-mid hover:text-primary transition-all duration-(--motion-drawer) rounded-ctl-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                  >
                    <span className="font-bold border-b border-s-border-hover group-hover:border-local-accent group-hover:text-local-accent-text transition-all duration-(--motion-drawer) pb-0.5">
                      {tLabels("visitProj")}
                    </span>
                    <ArrowIcon className="h-5 w-5 group-hover:text-local-accent-text ltr:group-hover:translate-x-0.5 rtl:group-hover:-translate-x-0.5" />
                  </a>
                </div>
              )}
              <div className="pt-2">
                <Link
                  href="/work"
                  className="group inline-flex items-center gap-2 text-muted-foreground transition-all duration-(--motion-drawer) hover:text-foreground eyebrow"
                >
                  <ArrowIcon
                    direction="back"
                    className="h-3.5 w-3.5 ltr:group-hover:-translate-x-0.5 rtl:group-hover:translate-x-0.5"
                  />
                  {tLabels("backLink")}
                </Link>
              </div>
            </aside>
          </div>
        </div>
      </Container>
    </section>
    <CaseStudyEndCta slug={slug} />
    </>
  );
}

function CaseStudyEndCta({ slug }: { slug: string }) {
  const t = useTranslations("common.endCta.pages.caseStudy");
  const tCS = useTranslations("caseStudies");

  const position = CASE_STUDIES.findIndex((cs) => cs.slug === slug);
  const current = CASE_STUDIES[position];
  const next =
    CASE_STUDIES.length > 1
      ? CASE_STUDIES[(position + 1) % CASE_STUDIES.length]
      : null;

  return (
    <SectionEndCta
      title={tCS("endCta.title")}
      body={tCS("endCta.body")}
      secondary="technicalCall"
      primary={
        current
          ? {
              href: getCommercialCta("projectRange", {
                projectType: current.projectType,
              }).href,
              label: tCS("endCta.estimate"),
              cta: "projectRange",
              context: { projectType: current.projectType },
            }
          : "projectRange"
      }
      aside={
        next && (
          <Link
            href={`/work/${next.slug}`}
            className="group flex max-w-xl flex-col gap-2 border-t border-border-subtle pt-6 outline-none focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ring"
          >
            <span className="eyebrow text-muted-foreground">{t("nextLabel")}</span>
            <span className="inline-flex items-center gap-3 text-[clamp(1.375rem,2.2vw,1.875rem)] font-medium leading-[1.2] tracking-[-0.02em] text-foreground transition-colors duration-(--motion-drawer) ease-smooth group-hover:text-local-accent-text rtl:tracking-normal">
              {tCS(`${next.slug}.name`)}
              <ArrowIcon className="size-5 shrink-0 ltr:group-hover:translate-x-0.5 rtl:group-hover:-translate-x-0.5" />
            </span>
            <span className="text-sm text-muted-foreground">
              {tCS(`${next.slug}.client`)} · {tCS(`${next.slug}.industry`)}
            </span>
          </Link>
        )
      }
    />
  );
}
