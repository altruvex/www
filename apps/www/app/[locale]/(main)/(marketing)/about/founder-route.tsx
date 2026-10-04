"use client";

import { Container } from "@/components/shared/container";
import { ExternalDirectionalLink } from "@/components/shared/directional-link";
import { Highlight } from "@/components/ui/emphasis";
import { MOTION, useSectionElement } from "@/lib/motion";
import { ScrollTrigger, gsap } from "@/lib/utils/gsap";
import { useTranslations } from "next-intl";
import { useEffect, useRef } from "react";

export function FounderRouteSection() {
  const t = useTranslations("about.founderRoute");
  const tFounder = useTranslations("about.founder");
  const routeRef = useRef<HTMLParagraphElement>(null);
  const quoteRef = useSectionElement<HTMLElement>();

  useEffect(() => {
    const route = routeRef.current;
    if (!route) return;

    const ctx = gsap.context(() => {
      gsap.matchMedia().add("(prefers-reduced-motion: no-preference)", () => {
        const lines = route.querySelectorAll("[data-route-line]");
        gsap.set(lines, { scaleX: 0 });
        const tween = gsap.to(lines, {
          scaleX: 1,
          duration: MOTION.duration.base,
          ease: MOTION.ease.strong,
          stagger: MOTION.stagger.sequence,
          paused: true,
        });
        const trigger = ScrollTrigger.create({
          trigger: route,
          start: MOTION.trigger.inView,
          once: true,
          onEnter: () => tween.play(),
        });
        return () => {
          trigger.kill();
          tween.kill();
        };
      });
    }, route);

    return () => ctx.revert();
  }, []);

  return (
    <section
      aria-labelledby="about-founder-heading"
      className="pt-(--section-y-top) pb-(--section-y-bottom)"
    >
      <Container className="grid gap-12 border-t border-border-subtle pt-10 lg:grid-cols-12 lg:gap-x-12 lg:pt-14">
        <div className="lg:col-span-5">
          <h2 id="about-founder-heading" className="eyebrow m-0 text-muted-foreground">
            {t("eyebrow")}
          </h2>
          <p
            ref={routeRef}
            className="mt-8 flex items-center gap-3 text-[0.9375rem] text-muted-foreground sm:gap-4"
          >
            <span className="shrink-0">{t("from")}</span>
            <span
              aria-hidden
              data-route-line
              className="h-px min-w-6 flex-1 origin-left bg-foreground/40 rtl:origin-right"
            />
            <span className="shrink-0 font-medium text-brand-text">{tFounder("name")}</span>
            <span
              aria-hidden
              data-route-line
              className="h-px min-w-6 flex-1 origin-left bg-foreground/40 rtl:origin-right"
            />
            <span className="shrink-0">{t("to")}</span>
          </p>
        </div>

        <figure ref={quoteRef} className="m-0 lg:col-span-7">
          <blockquote className="m-0 text-[clamp(1.6rem,2.8vw,2.6rem)] font-light leading-[1.2] tracking-[-0.025em] text-foreground rtl:leading-[1.6] rtl:tracking-normal">
            <p className="m-0">
              {t("quote")} <Highlight tone="soft">{t("quoteItalic")}</Highlight>
            </p>
          </blockquote>
          <figcaption className="mt-8 flex flex-wrap items-center gap-x-2 gap-y-1 text-[0.9375rem] text-muted-foreground">
            <span className="text-foreground">{tFounder("name")}</span>
            <span aria-hidden>·</span>
            <span>{tFounder("role")}</span>
            <span aria-hidden>·</span>
            <ExternalDirectionalLink
              href={tFounder("linkedInUrl")}
              className="text-foreground underline decoration-border underline-offset-4 transition-colors duration-(--motion-hover) hover:text-brand-text hover:decoration-current"
            >
              {tFounder("linkedInLabel")}
            </ExternalDirectionalLink>
          </figcaption>
        </figure>
      </Container>
    </section>
  );
}
