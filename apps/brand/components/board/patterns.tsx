"use client";

import { Check, Construction } from "lucide-react";
import { ButtonSpecimen } from "@/components/button-specimen";
import { Highlight } from "@repo/ui/www";
import { Widget, useT } from "./kit";

/** A section opening and closing as pages compose it: eyebrow, claim, lede, then the end pair. */
export function HeadingWidget(): React.ReactElement {
  const t = useT();
  return (
    <Widget
      uses={["heading", "eyebrow", "emphasis", "endCta"]}
      use="Opens every section: the eyebrow names the topic, the title makes the claim, at most one phrase carries emphasis — in the section's world. A section that asks for something closes with one primary and one secondary."
      avoid="Hand-rolling a heading, emphasis on more than one phrase, or a third button at the end."
    >
      <div className="px-3 py-6">
        <p className="eyebrow text-muted-foreground">{t("Process", "العملية")}</p>
        <h2 className="section-title mt-4 max-w-[18ch]">
          {t("Every decision, ", "كل قرار، ")}
          <Highlight tone="world">{t("written down.", "مكتوب.")}</Highlight>
        </h2>
        <p className="mt-4 max-w-[48ch] text-body text-muted-foreground">
          {t(
            "Scope, schedule and the hand-over are agreed in writing before the build starts.",
            "النطاق والجدول والتسليم متفق عليها كتابيًا قبل بدء البناء.",
          )}
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <ButtonSpecimen variant="primary">{t("Book a call", "احجز مكالمة")}</ButtonSpecimen>
          <ButtonSpecimen variant="secondary">{t("See how we work", "شاهد طريقة عملنا")}</ButtonSpecimen>
        </div>
      </div>
    </Widget>
  );
}

export function PlanWidget(): React.ReactElement {
  const t = useT();
  return (
    <Widget
      uses={["plan"]}
      use="Compares plans side by side. The recommended one carries the brand pill — never the world colour — and the primary action. Figures come from @repo/pricing-schema; the hours here are sample text."
      avoid="A world colour on the recommended badge, or a price typed into the page."
      footer={
        <div className="[&>*]:w-full">
          <ButtonSpecimen variant="primary">{t("Choose Care", "اختر الرعاية")}</ButtonSpecimen>
        </div>
      }
    >
      <div className="flex items-center justify-between gap-3">
        <p className="text-xl font-medium">{t("Care", "الرعاية")}</p>
        <span className="rounded-full bg-brand px-2.5 py-0.5 text-micro font-medium text-brand-foreground">
          {t("Recommended", "الأنسب")}
        </span>
      </div>
      <p className="mt-4 flex items-baseline gap-2">
        <span className="text-4xl font-light tracking-tight tabular-nums">{t("24 h", "24 ساعة")}</span>
        <span className="text-sm text-muted-foreground">{t("/ month", "/ شهريًا")}</span>
      </p>
      <p className="mt-2 text-sm text-muted-foreground">
        {t("Best for a live site that changes every month.", "الأنسب لموقع يتغير كل شهر.")}
      </p>
      <ul className="mt-5 grid gap-2 border-t border-border-subtle pt-5 text-md">
        {[
          t("Updates and fixes within the allowance", "تحديثات وإصلاحات ضمن الرصيد"),
          t("Monthly report of hours used", "تقرير شهري بالساعات المستخدمة"),
          t("Security patches applied", "تطبيق تحديثات الأمان"),
        ].map((line) => (
          <li key={line} className="flex gap-2">
            <Check className="mt-0.5 size-4 shrink-0 text-muted-foreground" aria-hidden />
            {line}
          </li>
        ))}
      </ul>
    </Widget>
  );
}

export function PlannedWidget(): React.ReactElement {
  const t = useT();
  return (
    <Widget
      title={t("Automations", "الأتمتة")}
      description={t("Not built yet", "لم تُبنَ بعد")}
      action={
        <span className="inline-flex items-center gap-1.5 rounded-ctl-xs border border-border-subtle bg-surface px-1.5 py-0.5 text-meta text-muted-foreground">
          <Construction className="size-3" aria-hidden />
          {t("Planned", "مخطط")}
        </span>
      }
      uses={["planned"]}
      use="A screen that is not built yet says Planned and what it will do. It never pretends to work."
      avoid="Sample rows, invented counts, or a success toast over a no-op."
    >
      <p className="text-md text-muted-foreground">
        {t(
          "Rules that act on a record when its state changes — a reminder before a renewal, a note when a deploy fails.",
          "قواعد تعمل على السجل عند تغيّر حالته — تذكير قبل التجديد، أو ملاحظة عند فشل النشر.",
        )}
      </p>
    </Widget>
  );
}
