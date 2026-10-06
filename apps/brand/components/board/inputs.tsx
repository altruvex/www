"use client";

import { useState } from "react";
import {
  Button,
  Calendar,
  Checkbox,
  DatePicker,
  Field,
  Input,
  Label,
  Popover,
  PopoverContent,
  PopoverTrigger,
  SegmentedControl,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectField,
  SelectValue,
  Switch,
  Textarea,
} from "@repo/ui";
import { Info } from "lucide-react";
import { ButtonSpecimen } from "@/components/button-specimen";
import { Widget, useDir, useT } from "./kit";

type Pace = "steady" | "fast" | "fixed";

export function ContactWidget(): React.ReactElement {
  const t = useT();
  return (
    <Widget
      title={t("Start a project", "ابدأ مشروعًا")}
      description={t("Fields: rest, error, disabled", "الحقول: عادي، خطأ، معطل")}
      uses={["input", "magnetic", "magneticClasses"]}
      use="Every input sits inside Field, so the label, the hint and the error are wired to it for screen readers."
      avoid="A placeholder standing in for the label, or an error shown only in red."
      footer={
        <div className="[&>*]:w-full">
          <ButtonSpecimen variant="primary">{t("Send", "إرسال")}</ButtonSpecimen>
        </div>
      }
    >
      <div className="grid gap-4">
        <Field label={t("Work email", "البريد المهني")} hint={t("We reply within one working day.", "نرد خلال يوم عمل واحد.")}>
          <Input type="email" placeholder="name@company.com" />
        </Field>
        <Field label={t("Company", "الشركة")} error={t("Tell us who the site is for.", "أخبرنا لمن الموقع.")}>
          <Input defaultValue="" aria-invalid />
        </Field>
        <Field label={t("Reference", "المرجع")}>
          <Input defaultValue="AX-2041" disabled />
        </Field>
      </div>
    </Widget>
  );
}

export function NoteWidget(): React.ReactElement {
  const t = useT();
  return (
    <Widget
      title={t("Notes", "ملاحظات")}
      description={t("Clinic booking site", "موقع حجز العيادة")}
      uses={["input", "button"]}
      use="A textarea for free text that belongs to a record, with the one action that keeps it right below."
      avoid="A save button that reports success before the write lands."
    >
      <Field label={t("Kick-off", "الاجتماع الأول")}>
        <Textarea
          rows={4}
          defaultValue={t(
            "Kick-off moved to Sunday. Client wants the Arabic pages first.",
            "تأجل الاجتماع الأول إلى الأحد. العميل يريد الصفحات العربية أولًا.",
          )}
        />
      </Field>
      <div className="mt-3 flex justify-end gap-2">
        <Button variant="ghost">{t("Cancel", "إلغاء")}</Button>
        <Button variant="brand">{t("Save note", "حفظ الملاحظة")}</Button>
      </div>
    </Widget>
  );
}

export function NotificationsWidget(): React.ReactElement {
  const t = useT();
  const [deploy, setDeploy] = useState(true);
  const [invoice, setInvoice] = useState(false);
  const [agree, setAgree] = useState(false);
  const rows = [
    { id: "deploy", en: "Deploys", ar: "النشر", hintEn: "When a preview goes live", hintAr: "عند نشر معاينة", on: deploy, set: setDeploy },
    { id: "invoice", en: "Invoices", ar: "الفواتير", hintEn: "When a milestone is billed", hintAr: "عند فوترة مرحلة", on: invoice, set: setInvoice },
  ];
  return (
    <Widget
      title={t("Notifications", "الإشعارات")}
      description={t("Switch and checkbox", "مفتاح ومربع اختيار")}
      uses={["switch", "checkbox", "label"]}
      use="A switch for a setting that applies the moment it flips; a checkbox for consent or a choice that applies on submit."
      avoid="A switch that only applies after Save — that is a checkbox."
    >
      <ul className="grid divide-y divide-border-subtle">
        {rows.map((row) => (
          <li key={row.id} className="flex items-center justify-between gap-4 py-3 first:pt-0">
            <label htmlFor={`notify-${row.id}`} className="min-w-0">
              <span className="block text-md font-medium">{t(row.en, row.ar)}</span>
              <span className="block text-meta text-muted-foreground">{t(row.hintEn, row.hintAr)}</span>
            </label>
            <Switch id={`notify-${row.id}`} checked={row.on} onCheckedChange={row.set} />
          </li>
        ))}
      </ul>
      <div className="mt-2 flex items-center gap-2 border-t border-border-subtle pt-4">
        <Checkbox id="notify-terms" checked={agree} onCheckedChange={(v) => setAgree(v === true)} />
        <Label htmlFor="notify-terms" className="text-md">
          {t("I agree to the terms", "أوافق على الشروط")}
        </Label>
      </div>
    </Widget>
  );
}

export function SetupWidget(): React.ReactElement {
  const t = useT();
  const [pace, setPace] = useState<Pace>("steady");
  return (
    <Widget
      title={t("Project setup", "إعداد المشروع")}
      description={t("Select, native select, segmented control", "قائمة، قائمة أصلية، تحكم مقسم")}
      uses={["select", "input", "segmented"]}
      use="A select for more than three known options; the native SelectField where the phone's own picker is better, such as a long plain list in a form. A segmented control for two or three answers seen at once. The menu floats on elev-2; its radius is the row radius plus its padding, so the corners stay concentric."
      avoid="A select for two options — use the segmented control."
    >
      <div className="grid gap-5">
        <Field label={t("Industry", "المجال")}>
          <Select defaultValue="health">
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="health">{t("Healthcare", "الرعاية الصحية")}</SelectItem>
              <SelectItem value="edu">{t("Education", "التعليم")}</SelectItem>
              <SelectItem value="retail">{t("Retail", "التجزئة")}</SelectItem>
              <SelectItem value="gov">{t("Public sector", "القطاع العام")}</SelectItem>
            </SelectContent>
          </Select>
        </Field>
        <Field label={t("Team size", "حجم الفريق")}>
          <SelectField defaultValue="small">
            <option value="solo">{t("Just me", "أنا فقط")}</option>
            <option value="small">{"\u20662–10\u2069"}</option>
            <option value="mid">{"\u206611–50\u2069"}</option>
            <option value="large">{"\u206650+\u2069"}</option>
          </SelectField>
        </Field>
        <SegmentedControl<Pace>
          label={t("Pace", "الوتيرة")}
          value={pace}
          onChange={setPace}
          options={[
            { value: "steady", label: t("Steady", "ثابتة") },
            { value: "fast", label: t("Fast", "سريعة") },
            { value: "fixed", label: t("Fixed date", "موعد محدد"), disabled: true },
          ]}
        />
      </div>
    </Widget>
  );
}

/** Latin digits in both languages (`nu-latn`), the rule every Arabic figure on the site follows. */
function dayFormat(dir: "ltr" | "rtl", options: Intl.DateTimeFormatOptions): Intl.DateTimeFormat {
  return new Intl.DateTimeFormat(dir === "rtl" ? "ar-EG-u-nu-latn" : "en-US", options);
}

/** One date, two ways in: the inline calendar and the field's picker share the same state. */
export function ScheduleWidget(): React.ReactElement {
  const t = useT();
  const dir = useDir();
  const [date, setDate] = useState<Date | undefined>(undefined);
  const caption = dayFormat(dir, { month: "long", year: "numeric" });
  const weekday = dayFormat(dir, { weekday: "narrow" });
  return (
    <Widget
      title={t("Kick-off", "الاجتماع الأول")}
      description={t("Calendar, date picker, popover", "تقويم، منتقي تاريخ، نافذة منبثقة")}
      uses={["calendar", "datePicker", "popover"]}
      use="The inline calendar where choosing a date is the whole task; the date picker inside a form, where it folds into one field. A popover holds a short note or a small control next to what it explains, and closes on outside click."
      avoid="A popover for a form or a long read — that is a sheet. Arabic dates in Eastern digits — format with ar-EG-u-nu-latn."
      action={
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="ghost" size="icon" aria-label={t("About the time zone", "عن المنطقة الزمنية")}>
              <Info />
            </Button>
          </PopoverTrigger>
          <PopoverContent dir={dir} align="end" className="w-64 text-md">
            <p className="font-medium">{t("Your time zone", "منطقتك الزمنية")}</p>
            <p className="mt-1 text-meta text-muted-foreground">
              {t(
                "Dates are shown in the reader's own time zone; where a fixed zone matters, its offset is written out (GMT+3).",
                "تُعرض التواريخ بتوقيت القارئ؛ وحين تهم منطقة ثابتة يُكتب فرقها (GMT+3).",
              )}
            </p>
          </PopoverContent>
        </Popover>
      }
    >
      <div className="grid gap-4">
        <div className="flex justify-center rounded-panel-sm border border-border-subtle">
          <Calendar
            dir={dir}
            mode="single"
            selected={date}
            onSelect={setDate}
            className="bg-transparent"
            formatters={{
              formatCaption: (d) => caption.format(d),
              formatWeekdayName: (d) => weekday.format(d),
            }}
          />
        </div>
        <Field label={t("Date", "التاريخ")}>
          <DatePicker
            date={date}
            onDateChange={setDate}
            placeholder={t("Pick a date", "اختر تاريخًا")}
            locale={dir === "rtl" ? "ar" : "en"}
            className="w-full"
          />
        </Field>
      </div>
    </Widget>
  );
}
