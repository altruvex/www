"use client";

import { MagneticButton } from "@/components/magnetic-button";
import { Container } from "@/components/shared/container";
import { ArrowLabel } from "@/components/shared/directional-link";
import { PhaseGate, phaseIndex, ScopeBars } from "@/components/shared/process-parts";
import { Eyebrow } from "@/components/ui/eyebrow";
import { bodyMarks } from "@/components/ui/rich-text";
import { Link } from "@/i18n/navigation";
import {
  splitWords,
  useSectionCardGrid,
  useSectionDescription,
  useSectionElement,
  useSectionEyebrow,
  useSectionTitle,
  useWordRead,
} from "@/lib/motion";
import { BUILD_PHASE, phaseName, type PhaseLength } from "@/lib/process-phases";
import { usePhaseLength, useProcessPhases } from "@/lib/use-process-phases";
import { ScrollTrigger } from "@/lib/utils/gsap";
import { cn, splitHeadline } from "@/lib/utils/utils";
import { useLocale, useTranslations } from "next-intl";
import { memo, useState, type TransitionEvent } from "react";
import { SectionHeading } from "./section-heading";

const HEADLINE_CLASS =
  "max-w-[22ch] text-[clamp(1.5rem,3vw,2.75rem)] leading-[1.15] font-light tracking-[-0.025em] text-balance text-foreground rtl:leading-[1.45] rtl:tracking-normal";

function ReadHeadline({ text }: { text: string }) {
  const readRef = useWordRead<HTMLParagraphElement>();
  return (
    <p ref={readRef} className={HEADLINE_CLASS}>
      {splitWords(text).map(({ key, word }) => (
        <span key={key} data-word>
          {word}
        </span>
      ))}
    </p>
  );
}

function PhaseItem({
  phase,
  position,
  next,
  open,
  read,
  onOpen,
}: {
  phase: PhaseLength;
  position: number;
  next: PhaseLength | undefined;
  open: boolean;
  read: boolean;
  onOpen: () => void;
}) {
  const t = useTranslations("process");
  const locale = useLocale();
  const length = usePhaseLength();
  const name = phaseName(t(`phases.${phase.key}.title`));
  const headline = t(`phases.${phase.key}.headline`);
  const panelId = `home-phase-${phase.key}`;

  const onPanelSettled = (event: TransitionEvent<HTMLDivElement>) => {
    if (event.target === event.currentTarget) ScrollTrigger.refresh();
  };

  return (
    <li data-index-row className="border-b border-border-subtle">
      <h3 className="m-0">
        <button
          type="button"
          aria-expanded={open}
          aria-controls={panelId}
          onClick={onOpen}
          className="grid w-full grid-cols-[2.5rem_minmax(0,1fr)_auto] items-baseline gap-4 py-4 text-start text-foreground transition-colors hover:text-local-accent-text aria-expanded:hover:text-foreground md:grid-cols-[3rem_minmax(0,1fr)_auto] md:py-5"
        >
          <span
            className={cn(
              "font-mono text-xs tabular-nums",
              open ? "text-local-accent-text" : "text-muted-foreground",
            )}
          >
            {phaseIndex(position, locale)}
          </span>
          <span className="text-[clamp(1.375rem,2.2vw,1.875rem)] leading-tight font-light tracking-[-0.02em] rtl:tracking-normal">
            {name}
          </span>
          <span className="text-sm font-normal text-muted-foreground tabular-nums">
            {length(phase)}
          </span>
        </button>
      </h3>

      <div
        id={panelId}
        role="region"
        aria-label={name}
        inert={!open}
        onTransitionEnd={onPanelSettled}
        className={cn(
          "grid transition-[grid-template-rows] duration-(--motion-base) ease-strong motion-reduce:transition-none",
          open ? "grid-rows-[1fr]" : "grid-rows-[0fr]",
        )}
      >
        <div className="min-h-0 overflow-clip">
          <div className="grid gap-8 pt-2 pb-10 md:ps-16">
            <p
              aria-hidden
              className="text-[clamp(3.25rem,10vw,9.5rem)] leading-[0.92] font-light tracking-[-0.05em] text-foreground rtl:leading-[1.25] rtl:tracking-normal"
            >
              {name}
            </p>
            {read ? (
              <ReadHeadline text={headline} />
            ) : (
              <p className={HEADLINE_CLASS}>{headline}</p>
            )}
            <PhaseGate phase={phase} next={next} reached={open} />
            <Link
              href={`/process#phase-${phase.key}`}
              className="group inline-flex min-h-6 items-center justify-self-start text-[0.9375rem] text-local-accent-text underline decoration-transparent underline-offset-4 transition-colors hover:decoration-current pointer-coarse:min-h-11"
            >
              <ArrowLabel>{t("readPhase")}</ArrowLabel>
            </Link>
          </div>
        </div>
      </div>
    </li>
  );
}

export const ProcessSection = memo(function ProcessSection() {
  const t = useTranslations("process");

  const eyebrowRef = useSectionEyebrow<HTMLParagraphElement>();
  const titleRef = useSectionTitle<HTMLHeadingElement>();
  const subtitleRef = useSectionDescription<HTMLParagraphElement>();
  const indexRef = useSectionCardGrid<HTMLOListElement>({ selector: "[data-index-row]" });
  const barsRef = useSectionCardGrid<HTMLDivElement>({ selector: "[data-scope-bar]" });
  const footerRef = useSectionElement();

  const { first, second } = splitHeadline(t("title"));
  const phases = useProcessPhases();
  const [open, setOpen] = useState<string>(BUILD_PHASE);
  const [touched, setTouched] = useState(false);

  return (
    <section
      id="process"
      aria-labelledby="process-heading"
      className="pt-(--section-y-top) pb-(--section-y-bottom)"
    >
      <Container>
        <SectionHeading
          titleId="process-heading"
          theme="surface"
          eyebrowRef={eyebrowRef}
          titleRef={titleRef}
          descriptionRef={subtitleRef}
          eyebrow={t("eyebrow")}
          firstTitle={first}
          secondTitle={second}
          description={t.rich("subtitle", bodyMarks)}
          className="mb-(--heading-gap)"
        />

        <ol ref={indexRef} className="border-t border-border-mid">
          {phases.map((phase, i) => (
            <PhaseItem
              key={phase.key}
              phase={phase}
              position={i}
              next={phases[i + 1]}
              open={phase.key === open}
              read={!touched && phase.key === BUILD_PHASE}
              onOpen={() => {
                setOpen(phase.key);
                setTouched(true);
              }}
            />
          ))}
        </ol>

        <div className="mt-(--section-block)">
          <Eyebrow className="mb-8 text-muted-foreground">
            {t("page.scope.title")} {t("page.scope.titleItalic")}
          </Eyebrow>
          <ScopeBars barsRef={barsRef} />
        </div>

        <div
          ref={footerRef}
          className="mt-(--section-block) flex flex-wrap items-center justify-between gap-x-12 gap-y-6"
        >
          <p className="max-w-[46ch] text-[clamp(1.0625rem,1.5vw,1.25rem)] text-foreground">
            {t("footer")}
          </p>
          <MagneticButton asChild variant="secondary" className="group">
            <Link href="/process">
              <ArrowLabel className="whitespace-nowrap">{t("more")}</ArrowLabel>
            </Link>
          </MagneticButton>
        </div>
      </Container>
    </section>
  );
});
