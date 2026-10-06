"use client";

import { ArrowIcon, Button } from "@repo/ui";
import { Plus, Trash2 } from "lucide-react";
import { ButtonSpecimen } from "@/components/button-specimen";
import { Cell, LABEL, Widget, useT } from "./kit";

export function ButtonsWidget(): React.ReactElement {
  const t = useT();
  return (
    <Widget
      title={t("Buttons", "الأزرار")}
      description={t("One primary per view; the rest step back", "زر رئيسي واحد لكل عرض، والباقي يتراجع")}
      uses={["magnetic", "magneticClasses", "button"]}
      use="Site dialect: primary for the one action the view exists for, secondary beside it, accent only inside a colour world. Tool dialect: brand to commit, outline and ghost for the rest, destructive-ghost to open a delete."
      avoid="Two primaries in one viewport, accent outside an accent-world section, or a solid destructive button as the first step of a delete."
    >
      <p className={LABEL}>{t("Site", "الموقع")}</p>
      <div className="mt-3 flex flex-wrap items-end gap-4">
        <Cell label="primary">
          <ButtonSpecimen variant="primary">{t("Start a project", "ابدأ مشروعًا")}</ButtonSpecimen>
        </Cell>
        <Cell label="secondary">
          <ButtonSpecimen variant="secondary">{t("See the process", "شاهد العملية")}</ButtonSpecimen>
        </Cell>
        <Cell label="ghost">
          <ButtonSpecimen variant="ghost">{t("Later", "لاحقًا")}</ButtonSpecimen>
        </Cell>
        <Cell label="filled">
          <ButtonSpecimen variant="filled">{t("Read more", "اقرأ المزيد")}</ButtonSpecimen>
        </Cell>
        <Cell label="accent · world">
          <ButtonSpecimen variant="accent">{t("Get an estimate", "احصل على تقدير")}</ButtonSpecimen>
        </Cell>
      </div>
      <div className="mt-4 flex flex-wrap items-end gap-4">
        <Cell label="sm">
          <ButtonSpecimen size="sm">{t("Small", "صغير")}</ButtonSpecimen>
        </Cell>
        <Cell label="default">
          <ButtonSpecimen>{t("Default", "افتراضي")}</ButtonSpecimen>
        </Cell>
        <Cell label="lg">
          <ButtonSpecimen size="lg">{t("Large", "كبير")}</ButtonSpecimen>
        </Cell>
      </div>

      <p className={`${LABEL} mt-6 border-t border-border-subtle pt-5`}>{t("Tools", "الأدوات")}</p>
      <div className="mt-3 flex flex-wrap items-end gap-3">
        <Cell label="brand">
          <Button variant="brand">{t("Save", "حفظ")}</Button>
        </Cell>
        <Cell label="default">
          <Button>{t("Continue", "متابعة")}</Button>
        </Cell>
        <Cell label="outline">
          <Button variant="outline">{t("Export", "تصدير")}</Button>
        </Cell>
        <Cell label="secondary">
          <Button variant="secondary">{t("Filter", "تصفية")}</Button>
        </Cell>
        <Cell label="ghost">
          <Button variant="ghost">{t("Cancel", "إلغاء")}</Button>
        </Cell>
        <Cell label="destructive-ghost">
          <Button variant="destructive-ghost">
            <Trash2 />
            {t("Delete", "حذف")}
          </Button>
        </Cell>
      </div>
      <div className="mt-4 flex flex-wrap items-end gap-3">
        <Cell label="loading">
          <Button variant="brand" loading>
            {t("Sending", "جارٍ الإرسال")}
          </Button>
        </Cell>
        <Cell label="disabled">
          <Button variant="brand" disabled>
            {t("Send", "إرسال")}
          </Button>
        </Cell>
        <Cell label="icon">
          <Button variant="outline" size="icon" aria-label={t("Add", "إضافة")}>
            <Plus />
          </Button>
        </Cell>
        <Cell label="sm · lg">
          <span className="flex items-end gap-2">
            <Button size="sm" variant="outline">
              sm
            </Button>
            <Button size="lg" variant="outline">
              lg
            </Button>
          </span>
        </Cell>
      </div>
    </Widget>
  );
}

export function LinksWidget(): React.ReactElement {
  const t = useT();
  return (
    <Widget
      title={t("Text links", "الروابط النصية")}
      description={t("A quiet way onward", "طريق هادئ للمتابعة")}
      uses={["arrow"]}
      use="A quiet way onward where a button would compete with the primary. The arrow turns itself in Arabic."
      avoid="An arrow on a link that does not leave the view."
    >
      <div className="grid gap-4">
        <Cell label="rest">
          <a href="#board" className="inline-flex items-center gap-1.5 text-base text-foreground underline decoration-border-mid underline-offset-4 hover:decoration-foreground">
            {t("How pricing works", "كيف يعمل التسعير")}
            <ArrowIcon motion="none" className="size-3.5" />
          </a>
        </Cell>
        <Cell label="muted">
          <a href="#board" className="inline-flex items-center gap-1.5 text-md text-muted-foreground hover:text-foreground">
            {t("All writing", "كل المقالات")}
            <ArrowIcon motion="none" className="size-3" />
          </a>
        </Cell>
      </div>
    </Widget>
  );
}
