"use client";

import { Container } from "@/components/shared/container";
import { SectionEndCta } from "@/components/sections/section-end-cta";
import { useSectionDescription, useSectionEyebrow, useSectionTitle } from "@/lib/motion";
import { cn } from "@/lib/utils/utils";
import { ChevronDown, MessageCircle } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";

export default function FAQPageClient() {
  const t = useTranslations("faq");
  const questions = Object.values(
    t.raw("questions") as Record<
      string,
      { question: string; answer: string; context?: string }
    >
  );

  const [openIndex, setOpenIndex] = useState<number | null>(null);

  const eyebrowRef = useSectionEyebrow<HTMLSpanElement>();
  const titleRef = useSectionTitle<HTMLHeadingElement>();
  const descRef = useSectionDescription<HTMLParagraphElement>();

  return (
    <>
      <section className="relative py-20 sm:py-28 md:py-32 overflow-hidden border-b border-foreground/10 bg-linear-to-b from-background to-foreground/5">
        <Container className="max-w-3xl relative z-10">
          <div className="flex flex-col items-center text-center space-y-6">
            <span
              ref={eyebrowRef}
              className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-foreground/5 border border-foreground/10 text-xs font-mono uppercase tracking-widest text-foreground/70 mb-2"
            >
              <MessageCircle className="w-3.5 h-3.5" />
              {t("eyebrow")}
            </span>
            <h1
              ref={titleRef}
              className="text-4xl sm:text-5xl md:text-6xl font-bold text-foreground tracking-tight"
            >
              {t("title")}
            </h1>
            <p
              ref={descRef}
              className="text-lg md:text-xl text-foreground/60 leading-relaxed max-w-2xl"
            >
              {t("subtitle")}
            </p>
          </div>
        </Container>
      </section>
      <section className="py-16 md:py-24 ps-section">
        <Container>
          <div className="max-w-3xl mx-auto space-y-4">
            {questions.map((item, index) => (
              <FAQItem
                key={index}
                question={item.question}
                answer={item.answer}
                isOpen={openIndex === index}
                onToggle={() =>
                  setOpenIndex(openIndex === index ? null : index)
                }
                index={index}
              />
            ))}
          </div>
        </Container>
      </section>
      
      <SectionEndCta variant="contact" />
    </>
  );
}

function FAQItem({
  question,
  answer,
  isOpen,
  onToggle,
  index,
}: {
  question: string;
  answer: string;
  isOpen: boolean;
  onToggle: () => void;
  index: number;
}) {
  return (
    <div
      className={cn(
        "group border rounded-xl transition-all duration-300 ease-in-out overflow-hidden",
        isOpen
          ? "border-foreground/20 bg-foreground/2 shadow-md"
          : "border-foreground/10 hover:border-foreground/20 bg-transparent hover:bg-foreground/1"
      )}
    >
      <button
        onClick={onToggle}
        className="w-full px-6 py-5 md:py-6 flex items-start justify-between gap-6 text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-foreground/50"
        aria-expanded={isOpen}
      >
        <div className="flex items-start gap-5 flex-1">
          <span
            className={cn(
              "text-sm font-mono font-bold mt-0.5 shrink-0 transition-colors duration-300",
              isOpen ? "text-primary" : "text-foreground/30 group-hover:text-foreground/50"
            )}
          >
            {String(index + 1).padStart(2, "0")}
          </span>
          <h2
            className={cn(
              "font-medium text-base md:text-lg leading-snug transition-colors duration-300",
              isOpen ? "text-foreground" : "text-foreground/80 group-hover:text-foreground"
            )}
          >
            {question}
          </h2>
        </div>
        <div
          className={cn(
            "flex items-center justify-center w-8 h-8 rounded-full shrink-0 transition-all duration-300",
            isOpen ? "bg-foreground/10" : "bg-foreground/5 group-hover:bg-foreground/10"
          )}
        >
          <ChevronDown
            className={cn(
              "w-4 h-4 text-foreground/60 transition-transform duration-500 ease-spring",
              isOpen && "rotate-180 text-foreground"
            )}
          />
        </div>
      </button>
      <div
        className={cn(
          "grid transition-all duration-300 ease-in-out",
          isOpen ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
        )}
      >
        <div className="overflow-hidden">
          <div
            className="px-6 pb-6 pt-2 border-t border-foreground/5 ml-13 text-foreground/70 text-sm md:text-base leading-relaxed [&_p]:mb-3 [&_p:last-child]:mb-0 [&_ol]:list-decimal [&_ol]:list-inside [&_ol]:space-y-2 [&_ol]:mb-3 [&_ol]:ml-2 [&_ul]:list-disc [&_ul]:list-inside [&_ul]:space-y-2 [&_ul]:mb-3 [&_ul]:ml-2 [&_li]:text-foreground/70 [&_strong]:font-semibold [&_strong]:text-foreground"
            dangerouslySetInnerHTML={{ __html: answer }}
          />
        </div>
      </div>
    </div>
  );
}