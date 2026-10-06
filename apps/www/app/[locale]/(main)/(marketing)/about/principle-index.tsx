"use client";

import { SectionHeading } from "@/components/sections/section-heading";
import { Container } from "@/components/shared/container";
import { Eyebrow } from "@repo/ui/www";
import { Num } from "@/components/ui/num";
import { useSectionCardGrid, useSectionDescription, useSectionTitle } from "@/lib/motion";
import { localizeNumbers } from "@/lib/utils/number";
import { cn } from "@/lib/utils/utils";
import { useLocale, useTranslations } from "next-intl";
import { useId, useState } from "react";

const PRINCIPLES = ["writing", "scope", "pricing", "ownership"] as const;

type Principle = (typeof PRINCIPLES)[number];

export function PrincipleIndexSection() {
  const t = useTranslations("about.principles");
  const locale = useLocale();
  const [open, setOpen] = useState<ReadonlySet<Principle>>(() => new Set([PRINCIPLES[0]]));

  const titleRef = useSectionTitle<HTMLHeadingElement>();
  const countRef = useSectionDescription<HTMLParagraphElement>();
  const listRef = useSectionCardGrid<HTMLOListElement>({ selector: "[data-index-row]" });

  const toggle = (key: Principle) =>
    setOpen((current) => {
      const next = new Set(current);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });

  return (
    <section
      aria-labelledby="about-principles-heading"
      className="accent-world-blue pt-(--section-y-top)"
    >
      <Container>
        <SectionHeading
          titleId="about-principles-heading"
          titleRef={titleRef}
          descriptionRef={countRef}
          firstTitle={t("title")}
          secondTitle={t("titleItalic")}
          description={t("count", {
            count: PRINCIPLES.length,
            n: localizeNumbers(String(PRINCIPLES.length), locale),
          })}
          classes={{
            title: "max-w-[16ch]",
            description: "eyebrow shrink-0 max-w-none md:max-w-none lg:max-w-none",
          }}
        />

        <ol ref={listRef} className="mt-(--heading-gap) border-b border-border-subtle">
          {PRINCIPLES.map((key, index) => (
            <PrincipleRow
              key={key}
              id={key}
              index={index}
              open={open.has(key)}
              onToggle={() => toggle(key)}
            />
          ))}
        </ol>
      </Container>
    </section>
  );
}

function PrincipleRow({
  id,
  index,
  open,
  onToggle,
}: {
  id: Principle;
  index: number;
  open: boolean;
  onToggle: () => void;
}) {
  const t = useTranslations("about.principles");
  const panelId = useId();

  return (
    <li data-index-row className="border-t border-border-subtle">
      <h3 className="m-0">
        <button
          type="button"
          aria-expanded={open}
          aria-controls={panelId}
          onClick={onToggle}
          className="group grid w-full cursor-pointer grid-cols-[2.5rem_minmax(0,1fr)_2rem] items-baseline gap-x-4 py-[clamp(1.5rem,2.6vw,2rem)] text-start focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-4 focus-visible:ring-offset-background lg:grid-cols-[4.5rem_minmax(0,1fr)_2.5rem]"
        >
          <span aria-hidden className="text-sm tabular-nums text-muted-foreground ltr:font-mono">
            <Num value={index + 1} pad={2} />
          </span>
          <span
            className={cn(
              "text-[clamp(1.9rem,4.6vw,4.25rem)] font-light leading-[1.04] tracking-[-0.035em] transition-[color,translate] duration-(--motion-drawer) ease-smooth group-hover:translate-x-2 motion-reduce:transition-none motion-reduce:group-hover:translate-x-0 rtl:leading-[1.35] rtl:tracking-normal rtl:group-hover:-translate-x-2",
              open ? "text-brand-text" : "text-foreground",
            )}
          >
            {t(`items.${id}.title`)}
          </span>
          <span
            aria-hidden
            className={cn(
              "justify-self-end text-[clamp(1.5rem,2.2vw,2rem)] font-light leading-none text-muted-foreground transition-transform duration-(--motion-drawer) ease-smooth group-hover:text-foreground motion-reduce:transition-none",
              open && "rotate-45 text-foreground",
            )}
          >
            +
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
          <div className="grid gap-6 pb-[clamp(2rem,4vw,3rem)] md:grid-cols-2 md:gap-x-12 lg:grid-cols-[4.5rem_minmax(0,1fr)_minmax(0,1fr)] lg:gap-x-4">
            <p className="max-w-[52ch] text-[clamp(1.0625rem,1.05vw,1.125rem)] leading-[1.75] text-muted-foreground lg:col-start-2 lg:pe-12">
              {t(`items.${id}.body`)}
            </p>
            <div>
              <Eyebrow className="m-0">{t("costLabel")}</Eyebrow>
              <p className="mt-3 max-w-[44ch] text-[clamp(1.0625rem,1.05vw,1.125rem)] leading-[1.6] text-foreground">
                {t(`items.${id}.cost`)}
              </p>
            </div>
          </div>
        </div>
      </div>
    </li>
  );
}
