"use client";

import { useState } from "react";
import { Avatar, Badge, Kbd, LoadingIcon, Skeleton, TableSkeleton, TilesSkeleton, toneClasses, toneDot, type Tone } from "@repo/ui";
import { FileSignature, Inbox, Rocket, Send, Wallet } from "lucide-react";
import { cn } from "@/lib/cn";
import { Cell, LABEL, Widget, useT } from "./kit";

const TONES: Tone[] = ["neutral", "info", "success", "warning", "danger", "progress"];

export function ProgressWidget(): React.ReactElement {
  const t = useT();
  return (
    <Widget
      title={t("Project progress", "تقدم المشروع")}
      description={t("Clinic booking site", "موقع حجز العيادة")}
      action={<Badge tone="progress">{t("Build", "البناء")}</Badge>}
      uses={["stat"]}
      use="One figure that answers one question, its context underneath, and a bar only when there is a known end."
      avoid="A bar without a total, or a trend arrow without its period."
    >
      <p className="text-4xl font-medium tracking-tight tabular-nums">60%</p>
      <p className="mt-1 text-meta text-muted-foreground">{t("Phase 3 of 5", "المرحلة 3 من 5")}</p>
      <div
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={60}
        aria-label={t("Project progress", "تقدم المشروع")}
        className="mt-4 grid h-1.5 grid-cols-5 gap-1"
      >
        {Array.from({ length: 5 }, (_, i) => (
          <span key={i} className={cn("rounded-full", i < 3 ? "bg-brand" : "bg-muted")} />
        ))}
      </div>
      <div className="mt-3 flex justify-between text-micro tabular-nums text-muted-foreground">
        <span>{t("Started 01 Sep", "بدأ 01 سبتمبر")}</span>
        <span>{t("Launch 20 Nov", "الإطلاق 20 نوفمبر")}</span>
      </div>
    </Widget>
  );
}

export function StatusWidget(): React.ReactElement {
  const t = useT();
  return (
    <Widget
      title={t("Status", "الحالة")}
      description={t("Every state carries a word", "كل حالة تحمل كلمة")}
      uses={["badge"]}
      use="A short state next to the thing it describes. Soft by default, outline in dense tables, a dot when the row scans by status."
      avoid="A badge as decoration, or a world colour on a status."
    >
      <div className="grid gap-3">
        {(["soft", "outline"] as const).map((variant) => (
          <div key={variant} className="flex flex-wrap items-center gap-1.5">
            {TONES.map((tone) => (
              <Badge key={tone} tone={tone} variant={variant}>
                {tone}
              </Badge>
            ))}
          </div>
        ))}
        <div className="flex flex-wrap items-center gap-1.5 border-t border-border-subtle pt-3">
          {([
            ["success", t("Live", "منشور")],
            ["warning", t("Due in 3 days", "يستحق خلال 3 أيام")],
            ["danger", t("Failed", "فشل")],
          ] as const).map(([tone, label]) => (
            <Badge key={tone} tone={tone}>
              <span className={cn("me-1 size-1.5 rounded-full", toneDot[tone])} aria-hidden />
              {label}
            </Badge>
          ))}
        </div>
      </div>
    </Widget>
  );
}

export function TeamWidget(): React.ReactElement {
  const t = useT();
  return (
    <Widget
      title={t("Small parts", "أجزاء صغيرة")}
      description={t("Avatar, key, loading, skeleton", "صورة، مفتاح، تحميل، هيكل")}
      uses={["avatar", "kbd", "loading", "skeleton"]}
      use="Avatar initials take a stable tint from the name. Kbd for shortcuts. The loading icon replaces content only while it is really loading."
      avoid="A skeleton that stays after the data has failed — show the error instead."
    >
      <div className="flex flex-wrap items-end justify-between gap-4">
        <Cell label="avatar">
          <span className="flex -space-x-2 rtl:space-x-reverse">
            <Avatar name="Omar Khaled" size="md" className="ring-2 ring-card" />
            <Avatar name="Nour Fathy" size="md" className="ring-2 ring-card" />
            <Avatar name="Sara Hassan" size="md" className="ring-2 ring-card" />
          </span>
        </Cell>
        <Cell label="kbd">
          <span className="flex gap-1">
            <Kbd>⌘</Kbd>
            <Kbd>K</Kbd>
          </span>
        </Cell>
        <Cell label="loading">
          <span className="flex items-end gap-2 text-muted-foreground">
            <LoadingIcon size="sm" />
            <LoadingIcon size="md" />
          </span>
        </Cell>
      </div>
      <div className="mt-5 flex items-center gap-3 border-t border-border-subtle pt-5" aria-hidden>
        <Skeleton className="size-9 shrink-0 rounded-full" />
        <div className="grid flex-1 gap-2">
          <Skeleton className="h-3.5 w-2/3" />
          <Skeleton className="h-3.5 w-full" />
        </div>
      </div>
    </Widget>
  );
}

const ACTIVITY = [
  { icon: FileSignature, tone: "success", en: "Contract signed", ar: "تم توقيع العقد", metaEn: "Clinic booking site", metaAr: "موقع حجز العيادة", date: ["12 Oct", "12 أكتوبر"] },
  { icon: Wallet, tone: "info", en: "Milestone invoiced", ar: "تمت فوترة المرحلة", metaEn: "Build · phase 3 of 5", metaAr: "البناء · المرحلة 3 من 5", date: ["09 Oct", "09 أكتوبر"] },
  { icon: Rocket, tone: "progress", en: "Preview deployed", ar: "نُشرت المعاينة", metaEn: "main · 4f2a91c", metaAr: "main · 4f2a91c", date: ["08 Oct", "08 أكتوبر"] },
  { icon: Send, tone: "neutral", en: "Proposal sent", ar: "أُرسل العرض", metaEn: "Opened twice", metaAr: "فُتح مرتين", date: ["02 Oct", "02 أكتوبر"] },
] as const satisfies ReadonlyArray<{ tone: Tone } & Record<string, unknown>>;

export function ActivityWidget(): React.ReactElement {
  const t = useT();
  const [page, setPage] = useState(1);
  const pages = 5;
  const pageSize = 4;
  const total = 18;
  return (
    <Widget
      title={t("Activity", "النشاط")}
      description={t("Last 30 days", "آخر 30 يومًا")}
      flush
      uses={["listRow", "pager"]}
      use="A feed of events: tone tile, what happened, where, and when. Each row opens its record. The pager says the range in words, with two-digit page numbers so the row does not jump."
      avoid="An icon tile in a colour that does not match the event's real state, or infinite scroll where people need to come back to a row."
      footer={
        <nav aria-label="Pagination" className="flex items-center justify-between gap-3">
          <p className="text-micro tabular-nums text-muted-foreground" aria-live="polite">
            {(page - 1) * pageSize + 1}–{Math.min(page * pageSize, total)} {t("of", "من")} {total}
          </p>
          <div className="flex items-center gap-0.5">
            {Array.from({ length: pages }, (_, i) => i + 1).map((n) => (
              <button
                key={n}
                type="button"
                aria-current={n === page ? "page" : undefined}
                onClick={() => setPage(n)}
                className={cn(
                  "flex size-7 items-center justify-center rounded-full text-micro tabular-nums transition-colors duration-(--motion-hover)",
                  n === page ? "bg-foreground text-background" : "text-muted-foreground hover:bg-foreground/6 hover:text-foreground",
                )}
              >
                {String(n).padStart(2, "0")}
              </button>
            ))}
          </div>
        </nav>
      }
    >
      <ul className="pb-2">
        {ACTIVITY.map((row) => (
          <li key={row.en}>
            <a
              href="#board"
              className="flex items-center gap-3 px-5 py-2.5 outline-none transition-colors duration-(--motion-hover) hover:bg-foreground/4 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-brand"
            >
              <span className={cn("flex size-7 shrink-0 items-center justify-center rounded-ctl-sm border [&_svg]:size-3.5", toneClasses[row.tone])}>
                <row.icon aria-hidden />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-md font-medium">{t(row.en, row.ar)}</span>
                <span className="block truncate text-meta text-muted-foreground">{t(row.metaEn, row.metaAr)}</span>
              </span>
              <span className="shrink-0 text-meta tabular-nums text-muted-foreground">{t(row.date[0], row.date[1])}</span>
            </a>
          </li>
        ))}
      </ul>
    </Widget>
  );
}

const LEDGER = [
  { date: ["03 Oct", "03 أكتوبر"], en: "Content updates", ar: "تحديثات المحتوى", hours: 4 },
  { date: ["07 Oct", "07 أكتوبر"], en: "Booking form fix", ar: "إصلاح نموذج الحجز", hours: 2.5 },
  { date: ["11 Oct", "11 أكتوبر"], en: "Performance pass", ar: "تحسين الأداء", hours: 6 },
  { date: ["14 Oct", "14 أكتوبر"], en: "Arabic page review", ar: "مراجعة الصفحات العربية", hours: 6 },
] as const;

const TABS = [
  { id: "hours", en: "Hours", ar: "الساعات" },
  { id: "invoices", en: "Invoices", ar: "الفواتير" },
  { id: "files", en: "Files", ar: "الملفات" },
] as const;

type TabId = (typeof TABS)[number]["id"];

/** A record view: tabs over a register. The other tabs are empty, and say so. */
export function LedgerWidget(): React.ReactElement {
  const t = useT();
  const [tab, setTab] = useState<TabId>("hours");
  const allowance = 24;
  const used = LEDGER.reduce((sum, row) => sum + row.hours, 0);

  return (
    <Widget
      title={t("Care allowance · October", "رصيد الصيانة · أكتوبر")}
      description={t("Clinic booking site", "موقع حجز العيادة")}
      action={
        <Badge tone={used < allowance ? "success" : "warning"}>
          {used < allowance ? t("On track", "ضمن الرصيد") : t("Used up", "انتهى الرصيد")}
        </Badge>
      }
      uses={["tabs", "edges", "empty"]}
      use="Tabs switch views of one record; the 2px rule marks the open one. A register opens with the heavy rule, separates rows with hairlines and closes with the total. An empty view says what will appear and how."
      avoid="Tabs that change what the page is about, boxes around rows, a heavy rule anywhere but the head of a register, or sample rows in an empty view."
    >
      <nav className="flex h-9 items-center gap-5 border-b border-border-subtle">
        {TABS.map((item) => {
          const active = item.id === tab;
          return (
            <button
              key={item.id}
              type="button"
              aria-current={active ? "page" : undefined}
              onClick={() => setTab(item.id)}
              className={cn(
                "relative -mb-px inline-flex h-9 shrink-0 items-center whitespace-nowrap border-b-2 text-base transition-colors duration-(--motion-hover)",
                active ? "border-foreground font-medium text-foreground" : "border-transparent text-muted-foreground hover:text-foreground",
              )}
            >
              {t(item.en, item.ar)}
            </button>
          );
        })}
      </nav>

      {tab === "hours" ? (
        <>
          <p className="mt-5 text-3xl font-medium tracking-tight tabular-nums">
            {used}
            <span className="text-lg text-muted-foreground">
              {" "}
              / {allowance} {t("h", "ساعة")}
            </span>
          </p>
          <table className="mt-5 w-full text-md">
            <caption className="sr-only">{t("Hours used this month", "الساعات المستخدمة هذا الشهر")}</caption>
            <thead className="border-t-2 border-foreground">
              <tr className={LABEL}>
                <th className="py-2 text-start font-normal">{t("Date", "التاريخ")}</th>
                <th className="py-2 text-start font-normal">{t("Work", "العمل")}</th>
                <th className="py-2 text-end font-normal">{t("Hours", "الساعات")}</th>
              </tr>
            </thead>
            <tbody>
              {LEDGER.map((row) => (
                <tr key={row.en} className="border-t border-border-subtle">
                  <td className="py-2 pe-3 tabular-nums text-muted-foreground">{t(row.date[0], row.date[1])}</td>
                  <td className="py-2">{t(row.en, row.ar)}</td>
                  <td className="py-2 text-end tabular-nums">{row.hours}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t border-foreground/45 font-medium">
                <td className="py-2" colSpan={2}>
                  {t("Left this month", "المتبقي هذا الشهر")}
                </td>
                <td className="py-2 text-end tabular-nums">{allowance - used}</td>
              </tr>
            </tfoot>
          </table>
        </>
      ) : (
        <div className="flex flex-col items-center px-6 py-12 text-center">
          <span className="mb-3 flex size-9 items-center justify-center rounded-ctl-lg border border-border-subtle bg-surface text-muted-foreground">
            <Inbox className="size-4" aria-hidden />
          </span>
          <p className="text-md font-semibold">
            {tab === "invoices" ? t("No invoices yet", "لا توجد فواتير بعد") : t("No files yet", "لا توجد ملفات بعد")}
          </p>
          <p className="mt-1.5 max-w-sm text-base text-muted-foreground">
            {tab === "invoices"
              ? t("Invoices appear here once a milestone is billed.", "تظهر الفواتير هنا عند فوترة أول مرحلة.")
              : t("Files appear here once they are attached to the record.", "تظهر الملفات هنا عند إرفاقها بالسجل.")}
          </p>
        </div>
      )}
    </Widget>
  );
}

/** The two loading shapes the admin lists use, at the size they really are. */
export function LoadingWidget(): React.ReactElement {
  const t = useT();
  return (
    <Widget
      title={t("Loading a list", "تحميل قائمة")}
      description={t("Tiles and table skeletons", "هياكل البطاقات والجدول")}
      uses={["skeleton"]}
      use="While a list or a dashboard loads, the skeleton takes the shape of what is coming: tiles for the figures, rows for the table. On the admin these sit in loading.tsx files."
      avoid="A spinner over a whole page, or a skeleton that keeps showing after the data says there is nothing."
    >
      <div className="grid gap-4">
        <TilesSkeleton count={4} />
        <TableSkeleton rows={4} cols={4} />
      </div>
    </Widget>
  );
}
