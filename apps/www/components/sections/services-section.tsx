"use client";

import { CtaButtonGroup } from "@/components/interactive/cta-button-group";
import { MagneticButton } from "@/components/magnetic-button";
import { Container } from "@/components/shared/container";
import { ArrowLabel } from "@/components/shared/directional-link";
import { Eyebrow } from "@/components/ui/eyebrow";
import { Num } from "@/components/ui/num";
import { Link } from "@/i18n/navigation";
import {
  useSectionCardGrid,
  useSectionDescription,
  useSectionEyebrow,
  useSectionTitle,
} from "@/lib/motion";
import { cn, splitHeadline } from "@/lib/utils/utils";
import { useTranslations } from "next-intl";
import Image from "next/image";
import { memo, useId, useState } from "react";
import { SERVICE_ORDER, type ServiceEntry } from "./services-index/data";
import { SectionHeading } from "./section-heading";

type ServiceId = ServiceEntry["id"];

const ACTION_HREF: Record<ServiceId, string> = {
  website: "/contact?service=interface-design",
  portal: "/contact?service=development",
  audit: "/contact?service=consulting&package=audit",
  maintenance: "/contact?service=maintenance",
};

const ROW_IMAGE: Record<ServiceId, string> = {
  website: "/brand/mood/blue-wall-light-bands.webp",
  portal: "/brand/mood/blue-concrete.webp",
  audit: "/brand/mood/single-lamp-dark-wall.webp",
  maintenance: "/brand/mood/blue-ribs-light.webp",
};

function RegisterDivider({ label, count }: { label: string; count: number }) {
  return (
    <div className="flex items-baseline gap-4">
      <Eyebrow className="m-0">{label}</Eyebrow>
      <span className="text-sm tabular-nums text-muted-foreground ltr:font-mono">
        <Num value={count} pad={2} />
      </span>
      <div aria-hidden className="h-px flex-1 bg-border-subtle/60" />
    </div>
  );
}

const DisciplineRow = memo(function DisciplineRow({
  service,
  index,
  open,
  onToggle,
}: {
  service: ServiceEntry;
  index: number;
  open: boolean;
  onToggle: () => void;
}) {
  const t = useTranslations("services.action");
  const tPage = useTranslations("servicesPage");
  const panelId = useId();
  const deliverables: string[] = tPage.raw(`services.${service.id}.deliverables`);

  return (
    <li data-register-row className="border-t border-border-subtle">
      <h3 className="m-0">
        <button
          type="button"
          aria-expanded={open}
          aria-controls={panelId}
          onClick={onToggle}
          className="group grid w-full cursor-pointer grid-cols-[3rem_minmax(0,1fr)] items-baseline gap-x-4 gap-y-1 py-[clamp(1.25rem,2.4vw,2rem)] text-start lg:grid-cols-[4.5rem_minmax(0,1fr)_minmax(0,20rem)]"
        >
          <span
            aria-hidden
            className="text-sm tabular-nums text-muted-foreground ltr:font-mono"
          >
            <Num value={index + 1} pad={2} />
          </span>
          <span
            className={cn(
              "text-[clamp(2rem,5.4vw,4.75rem)] font-light leading-[1.02] tracking-[-0.035em] transition-colors duration-(--motion-drawer) ease-smooth rtl:leading-[1.3] rtl:tracking-normal",
              open
                ? "text-foreground"
                : "text-muted-foreground group-hover:text-foreground",
            )}
          >
            {tPage(`capabilities.${service.name}`)}
          </span>
          <span className="col-start-2 text-[0.9375rem] font-normal leading-normal text-muted-foreground lg:col-start-3 lg:text-end">
            {tPage(`services.${service.id}.problem`)}
          </span>
        </button>
      </h3>

      <div
        id={panelId}
        inert={!open}
        className={cn(
          "grid transition-[grid-template-rows] duration-(--motion-base) ease-smooth motion-reduce:transition-none",
          open ? "grid-rows-[1fr]" : "grid-rows-[0fr]",
        )}
      >
        <div className="min-h-0 overflow-hidden">
          <div className="grid gap-8 pb-[clamp(2rem,4vw,3.5rem)] lg:grid-cols-[4.5rem_minmax(0,5fr)_minmax(0,7fr)] lg:gap-x-12">
            <div className="lg:col-start-2">
              <p className="text-balance text-[clamp(1.5rem,2.4vw,2.125rem)] font-light leading-[1.2] text-brand-text rtl:font-medium rtl:leading-[1.45]">
                {tPage(`services.${service.id}.leaves`)}
              </p>

              <ul className="mt-7 border-t border-border-subtle">
                {deliverables.map((item) => (
                  <li
                    key={item}
                    className="border-b border-border-subtle py-3 text-[0.9375rem] leading-relaxed text-muted-foreground"
                  >
                    {item}
                  </li>
                ))}
              </ul>

              <div className="mt-7 flex flex-wrap items-center gap-x-6 gap-y-3">
                <MagneticButton asChild variant="primary" className="group">
                  <Link href={ACTION_HREF[service.id]}>
                    <ArrowLabel className="whitespace-nowrap">
                      {t(service.id)}
                    </ArrowLabel>
                  </Link>
                </MagneticButton>
                <span className="text-[0.8125rem] leading-normal text-muted-foreground">
                  {t("hint")}
                </span>
              </div>

            </div>

            <figure
              className={cn(
                "relative m-0 aspect-16/10 overflow-hidden rounded-panel-sm transition-[clip-path] duration-(--motion-text) ease-strong motion-reduce:transition-none",
                open
                  ? "[clip-path:inset(0_round_var(--radius-panel-md))]"
                  : "[clip-path:inset(10%_6%_round_var(--radius-panel-md))]",
              )}
            >
              <Image
                src={ROW_IMAGE[service.id]}
                alt=""
                fill
                sizes="(min-width: 1024px) 55vw, 100vw"
                quality={70}
                draggable={false}
                className={cn(
                  "select-none object-cover transition-transform duration-(--motion-display) ease-strong motion-reduce:transition-none",
                  open ? "scale-100" : "scale-[1.12]",
                )}
              />
            </figure>
          </div>
        </div>
      </div>
    </li>
  );
});

export const ServicesSection = memo(function ServicesSection() {
  const t = useTranslations("services");
  const tStandard = useTranslations("servicesPage.chapters.plate");
  const tReceipt = useTranslations("contactPage.receipt");
  const standard: string[] = tStandard.raw("items");
  const steps = (["read", "reply", "call"] as const).map((step) =>
    tReceipt(`steps.${step}`),
  );

  const [openId, setOpenId] = useState<ServiceId | null>(SERVICE_ORDER[0].id);

  const eyebrowRef = useSectionEyebrow<HTMLParagraphElement>();
  const titleRef = useSectionTitle<HTMLHeadingElement>();
  const subtitleRef = useSectionDescription<HTMLParagraphElement>();
  const registerRef = useSectionCardGrid<HTMLDivElement>({
    selector: "[data-register-row]",
  });

  const { first, second } = splitHeadline(t("title"));

  return (
    <section
      id="services"
      aria-labelledby="services-heading"
      className="pt-(--section-y-top) pb-(--section-y-bottom)"
    >
      <Container>
        <SectionHeading
          titleId="services-heading"
          theme="surface"
          eyebrowRef={eyebrowRef}
          titleRef={titleRef}
          descriptionRef={subtitleRef}
          eyebrow={t("eyebrow")}
          firstTitle={first}
          secondTitle={second}
          description={t("subtitle")}
          className="mb-(--heading-gap)"
        />

        <div ref={registerRef}>
          <RegisterDivider
            label={t("disciplines.label")}
            count={SERVICE_ORDER.length}
          />

          <ol className="mt-6 list-none border-b border-border-subtle">
            {SERVICE_ORDER.map((service, index) => (
              <DisciplineRow
                key={service.id}
                service={service}
                index={index}
                open={openId === service.id}
                onToggle={() =>
                  setOpenId((current) =>
                    current === service.id ? null : service.id,
                  )
                }
              />
            ))}
          </ol>

          <div className="mt-(--section-block)">
            <RegisterDivider
              label={t("standard.label")}
              count={standard.length}
            />
          </div>

          <ol className="mt-10 grid list-none gap-x-10 gap-y-8 sm:grid-cols-2 md:mt-12 lg:grid-cols-4 lg:gap-x-12">
            {standard.map((item, index) => (
              <li
                key={item}
                data-register-row
                className="grid grid-cols-[2.75rem_minmax(0,1fr)] lg:grid-cols-1 lg:gap-y-3"
              >
                <span
                  aria-hidden
                  className="pt-0.5 text-sm tabular-nums text-muted-foreground ltr:font-mono"
                >
                  <Num value={index + 1} pad={2} />
                </span>
                <p className="text-[clamp(0.9375rem,1vw,1.0625rem)] leading-relaxed text-foreground">
                  {item}
                </p>
              </li>
            ))}
          </ol>

          <div
            data-register-row
            className="mt-(--section-block) grid gap-10 border-t border-border-subtle pt-[clamp(2rem,4vw,3rem)] lg:grid-cols-[minmax(0,6fr)_minmax(0,5fr)] lg:items-start lg:gap-16"
          >
            <div>
              <h3 className="text-balance text-[clamp(1.625rem,2.8vw,2.5rem)] font-normal leading-[1.12] tracking-[-0.02em] text-foreground rtl:leading-[1.3] rtl:tracking-normal">
                {t("next.title")}
              </h3>
              <p className="mt-4 max-w-[34rem] text-base leading-relaxed text-muted-foreground">
                {t("next.description")}
              </p>
            </div>

            <div>
              <Eyebrow className="mb-4">{tReceipt("nextLabel")}</Eyebrow>
              <ol className="list-none border-t border-border-subtle">
                {steps.map((step, index) => (
                  <li
                    key={step}
                    className="grid grid-cols-[2.75rem_minmax(0,1fr)] border-b border-border-subtle py-4 text-[0.9375rem] leading-relaxed text-foreground"
                  >
                    <span
                      aria-hidden
                      className="text-sm tabular-nums text-muted-foreground ltr:font-mono"
                    >
                      <Num value={index + 1} pad={2} />
                    </span>
                    {step}
                  </li>
                ))}
              </ol>
              <CtaButtonGroup
                className="mt-8"
                primary={{ href: "/contact", label: t("next.primary") }}
                secondary={{ href: "/schedule", label: t("next.secondary") }}
              />
            </div>
          </div>
        </div>
      </Container>
    </section>
  );
});
