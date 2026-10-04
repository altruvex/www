"use client";

import { scrollToY } from "@/lib/motion";
import { localizeNumbers } from "@/lib/utils/number";
import { cn } from "@/lib/utils/utils";
import { useLocale, useTranslations } from "next-intl";
import { useEffect, useRef, useState, type MouseEvent, type ReactNode } from "react";

const NAV_OFFSET = 96;

type ArticleReaderProps = {
  headings: string[];
  readTimeMinutes: number;
  proseClassName: string;
  children: ReactNode;
};

export function ArticleReader({
  headings,
  readTimeMinutes,
  proseClassName,
  children,
}: ArticleReaderProps) {
  const t = useTranslations("writing.article");
  const locale = useLocale();
  const proseRef = useRef<HTMLDivElement>(null);
  const barRef = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(-1);
  const [minutesLeft, setMinutesLeft] = useState(readTimeMinutes);

  useEffect(() => {
    const prose = proseRef.current;
    if (!prose) return;
    const sections = Array.from(prose.querySelectorAll("h2"));
    sections.forEach((h, n) => {
      if (!h.id) h.id = `section-${n + 1}`;
    });

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setActive(sections.indexOf(entry.target as HTMLHeadingElement));
          }
        }
      },
      { rootMargin: "-20% 0px -70% 0px" },
    );
    sections.forEach((h) => observer.observe(h));
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const prose = proseRef.current;
    const bar = barRef.current;
    if (!prose || !bar) return;
    let frame = 0;

    const update = () => {
      frame = 0;
      const rect = prose.getBoundingClientRect();
      const total = Math.max(1, rect.height - window.innerHeight * 0.5);
      const progress = Math.min(1, Math.max(0, -rect.top / total));
      bar.style.transform = `scaleX(${progress})`;
      setMinutesLeft(Math.ceil(readTimeMinutes * (1 - progress)));
    };
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };

    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      if (frame) cancelAnimationFrame(frame);
    };
  }, [readTimeMinutes]);

  const goTo = (event: MouseEvent<HTMLAnchorElement>, n: number) => {
    const target = document.getElementById(`section-${n}`);
    if (!target) return;
    event.preventDefault();
    scrollToY(target.getBoundingClientRect().top + window.scrollY - NAV_OFFSET);
    target.setAttribute("tabindex", "-1");
    target.focus({ preventScroll: true });
  };

  return (
    <>
      <div
        ref={barRef}
        aria-hidden
        className="pointer-events-none fixed inset-x-0 top-14 z-41 h-0.5 origin-left bg-brand lg:top-15 rtl:origin-right"
        style={{ transform: "scaleX(0)" }}
      />
      <div className="mt-14 grid grid-cols-[minmax(0,1fr)] gap-10 border-t border-border-subtle pt-10 md:mt-20 md:pt-16 min-[1100px]:grid-cols-[minmax(0,48rem)_minmax(0,1fr)] min-[1100px]:gap-[clamp(40px,7vw,120px)]">
        <div ref={proseRef} className={proseClassName}>
          {children}
        </div>
        {headings.length > 0 && (
          <aside className="sticky top-28 hidden w-full max-w-75 self-start justify-self-end min-[1100px]:block">
            <nav aria-label={t("contents")}>
              <p className="eyebrow text-muted-foreground">{t("contents")}</p>
              <ol className="mt-3.5 border-s border-border-subtle">
                {headings.map((heading, i) => (
                  <li key={`${i}-${heading}`}>
                    <a
                      href={`#section-${i + 1}`}
                      onClick={(event) => goTo(event, i + 1)}
                      aria-current={active === i ? "location" : undefined}
                      className={cn(
                        "-ms-px block border-s py-2 ps-4 text-sm leading-snug transition-colors duration-(--motion-drawer) ease-smooth hover:text-foreground",
                        active === i
                          ? "border-brand text-foreground"
                          : "border-transparent text-muted-foreground",
                      )}
                    >
                      {heading}
                    </a>
                  </li>
                ))}
              </ol>
              {minutesLeft > 0 && (
                <p className="mt-4.5 text-[0.8125rem] text-muted-foreground">
                  {localizeNumbers(t("minutesLeft", { count: minutesLeft }), locale)}
                </p>
              )}
            </nav>
          </aside>
        )}
      </div>
    </>
  );
}
