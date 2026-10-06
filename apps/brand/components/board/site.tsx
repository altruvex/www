"use client";

import { useState } from "react";
import { Button } from "@repo/ui";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
  DatePicker,
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  SelectField,
  Textarea,
  TimePicker,
} from "@repo/ui/www";
import { Widget, useDir, useT } from "./kit";

/*
 * The site's form dialect (`@repo/ui/www`): underline fields and eyebrow labels, as on the
 * public booking form. It lives beside the tool dialect rather than inside it, so it gets its
 * own widget instead of being mixed into the tool forms.
 */

export function SiteFormWidget(): React.ReactElement {
  const t = useT();
  const dir = useDir();
  const locale = dir === "rtl" ? "ar" : "en";
  const [date, setDate] = useState<Date | undefined>(undefined);
  const [time, setTime] = useState("");
  return (
    <Widget
      title={t("Book a call", "احجز مكالمة")}
      description={t("Site dialect · @repo/ui/www", "لهجة الموقع · \u2066@repo/ui/www\u2069")}
      uses={["siteLabel", "siteInput", "siteSelect", "siteDatePicker", "siteCalendar", "siteTimePicker", "siteAccordion"]}
      use="Public forms on the site: an underline field under an eyebrow label, a date and a time picked from short lists. Extra questions fold away in the accordion so the form reads short."
      avoid="Mixing these with the boxed tool fields in one form, or the site dialect inside the admin."
    >
      <div className="grid gap-5">
        <div className="grid gap-1.5">
          <Label htmlFor="site-name">{t("Your name", "اسمك")}</Label>
          <Input id="site-name" autoComplete="off" placeholder={t("Full name", "الاسم الكامل")} />
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="site-email">{t("Work email", "البريد المهني")}</Label>
          <Input id="site-email" type="email" autoComplete="off" placeholder="name@company.com" />
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="site-kind">{t("Project", "المشروع")}</Label>
          <Select defaultValue="new">
            <SelectTrigger id="site-kind" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent dir={dir}>
              <SelectItem value="new">{t("A new site", "موقع جديد")}</SelectItem>
              <SelectItem value="rebuild">{t("A rebuild", "إعادة بناء")}</SelectItem>
              <SelectItem value="care">{t("Maintenance", "صيانة")}</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="grid gap-1.5">
          <Label>{t("Day", "اليوم")}</Label>
          <DatePicker date={date} onDateChange={setDate} placeholder={t("Pick a day", "اختر يومًا")} locale={locale} />
        </div>
        <div className="grid gap-1.5">
          <Label>{t("Time", "الوقت")}</Label>
          <TimePicker value={time} onChange={setTime} hourPlaceholder={t("Hour", "الساعة")} minutePlaceholder={t("Min", "الدقيقة")} locale={locale} />
        </div>
        <Accordion type="single" collapsible>
          <AccordionItem value="more">
            <AccordionTrigger>{t("More about the project", "المزيد عن المشروع")}</AccordionTrigger>
            <AccordionContent>
              <div className="grid gap-5 pt-1">
                <div className="grid gap-1.5">
                  <Label htmlFor="site-size">{t("Pages", "الصفحات")}</Label>
                  <SelectField id="site-size" defaultValue="mid">
                    <option value="small">{"\u20661–5\u2069"}</option>
                    <option value="mid">{"\u20666–15\u2069"}</option>
                    <option value="large">{"\u206616+\u2069"}</option>
                  </SelectField>
                </div>
                <div className="grid gap-1.5">
                  <Label htmlFor="site-note">{t("Anything else", "أي شيء آخر")}</Label>
                  <Textarea id="site-note" rows={3} />
                </div>
              </div>
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </div>
    </Widget>
  );
}

/** The site's drawer: the same task as the tool drawer, in the site dialect, for comparison. */
export function SiteDrawerWidget(): React.ReactElement {
  const t = useT();
  const dir = useDir();
  return (
    <Widget
      title={t("Site drawer", "درج الموقع")}
      description={t("A second copy of the drawer", "نسخة ثانية من الدرج")}
      uses={["siteDrawer", "drawer"]}
      use="Shown only to compare: the site keeps its own drawer beside the tool one. Open both and decide which one stays."
      avoid="A third copy. A new drawer imports one of these two."
    >
      <div className="flex items-center justify-between gap-3">
        <p className="text-md text-muted-foreground">{t("Opens from the bottom", "يفتح من الأسفل")}</p>
        <Drawer>
          <DrawerTrigger asChild>
            <Button variant="outline" size="sm">
              {t("Open", "فتح")}
            </Button>
          </DrawerTrigger>
          <DrawerContent dir={dir}>
            <div className="mx-auto w-full max-w-sm">
              <DrawerHeader>
                <DrawerTitle>{t("Site drawer", "درج الموقع")}</DrawerTitle>
                <DrawerDescription>
                  {t("From packages/ui/src/www/drawer.tsx.", "من packages/ui/src/www/drawer.tsx.")}
                </DrawerDescription>
              </DrawerHeader>
              <DrawerFooter>
                <DrawerClose asChild>
                  <Button variant="outline">{t("Close", "إغلاق")}</Button>
                </DrawerClose>
              </DrawerFooter>
            </div>
          </DrawerContent>
        </Drawer>
      </div>
    </Widget>
  );
}
