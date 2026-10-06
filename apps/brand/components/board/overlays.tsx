"use client";

import { useState } from "react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  Badge,
  Button,
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  Hint,
  Sheet,
  SheetBody,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  TooltipProvider,
  toast,
} from "@repo/ui";
import { Check, Copy, FileText, MoreHorizontal, PanelRight, Trash2 } from "lucide-react";
import { cn } from "@/lib/cn";
import { Widget, useDir, useT } from "./kit";

/**
 * A proposal row that exercises every overlay a record uses: the tooltip names the icon button,
 * the menu holds the secondary actions and two view toggles, "Open details" opens the sheet, and
 * Delete asks first in an alert dialog. Everything acts on this sample row only.
 */
export function ProposalWidget(): React.ReactElement {
  const t = useT();
  const dir = useDir();
  const [removed, setRemoved] = useState(false);
  const [showStatus, setShowStatus] = useState(true);
  const [showDate, setShowDate] = useState(true);
  const [details, setDetails] = useState(false);
  const [confirm, setConfirm] = useState(false);
  const title = t("Clinic booking site", "موقع حجز العيادة");

  function copyTitle(): void {
    navigator.clipboard.writeText(title).then(
      () => toast.success(t("Title copied", "تم نسخ العنوان")),
      () => toast.error(t("The browser blocked the clipboard", "المتصفح منع الوصول للحافظة")),
    );
  }

  function remove(): void {
    setRemoved(true);
    toast(t("Proposal removed from the board", "أُزيل العرض من اللوحة"), {
      action: { label: t("Undo", "تراجع"), onClick: () => setRemoved(false) },
    });
  }

  return (
    <Widget
      title={t("Proposals", "العروض")}
      description={t("Tooltip, menu, sheet, alert dialog, toast", "تلميح، قائمة، لوح، تأكيد، إشعار")}
      uses={["tooltip", "menu", "sheet", "alertDialog", "toaster"]}
      use="The tooltip names an icon-only control. The menu holds a row's secondary actions and view toggles; the destructive item sits last, after a separator, and asks first in an alert dialog. The sheet shows a record's details without leaving the list. A toast confirms what already happened and offers Undo when it can."
      avoid="A tooltip as the only place an instruction lives, the row's main action hidden in the menu, a delete without a confirmation, or a toast before the action has landed."
    >
      {removed ? (
        <div className="flex items-center justify-between gap-3 rounded-panel-sm border border-dashed border-border-subtle p-3">
          <p className="text-md text-muted-foreground">{t("The sample row is removed.", "أُزيل الصف التجريبي.")}</p>
          <Button variant="outline" size="sm" onClick={() => setRemoved(false)}>
            {t("Restore", "استعادة")}
          </Button>
        </div>
      ) : (
        <TooltipProvider delayDuration={200}>
          <div className="flex items-center gap-3 rounded-panel-sm border border-border-subtle p-3">
            <span className="flex size-9 shrink-0 items-center justify-center rounded-ctl-lg bg-surface text-muted-foreground">
              <FileText className="size-4" aria-hidden />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-md font-medium">{title}</span>
              {(showStatus || showDate) && (
                <span className="mt-0.5 flex items-center gap-2 text-meta text-muted-foreground">
                  {showStatus && (
                    <Badge tone="info" variant="outline">
                      {t("Sent", "أُرسل")}
                    </Badge>
                  )}
                  {showDate && t("02 Oct", "02 أكتوبر")}
                </span>
              )}
            </span>
            <Hint label={t("Copy title", "نسخ العنوان")} side="top">
              <Button variant="ghost" size="icon" aria-label={t("Copy title", "نسخ العنوان")} onClick={copyTitle}>
                <Copy />
              </Button>
            </Hint>
            {/* Not modal: a modal menu that opens a modal dialog leaves body pointer-events stuck at none. */}
            <DropdownMenu dir={dir} modal={false}>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="icon" aria-label={t("More actions", "إجراءات أخرى")}>
                  <MoreHorizontal />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuLabel>{t("Proposal", "العرض")}</DropdownMenuLabel>
                <DropdownMenuItem onSelect={() => setDetails(true)}>
                  <PanelRight />
                  {t("Open details", "فتح التفاصيل")}
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuLabel>{t("Show in the row", "إظهار في الصف")}</DropdownMenuLabel>
                <DropdownMenuCheckboxItem checked={showStatus} onCheckedChange={(v) => setShowStatus(v === true)}>
                  {t("Status", "الحالة")}
                </DropdownMenuCheckboxItem>
                <DropdownMenuCheckboxItem checked={showDate} onCheckedChange={(v) => setShowDate(v === true)}>
                  {t("Sent date", "تاريخ الإرسال")}
                </DropdownMenuCheckboxItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem destructive onSelect={() => setConfirm(true)}>
                  <Trash2 />
                  {t("Delete", "حذف")}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </TooltipProvider>
      )}

      <Sheet open={details} onOpenChange={setDetails}>
        <SheetContent dir={dir} width="sm">
          <SheetHeader>
            <SheetTitle>{title}</SheetTitle>
            <SheetDescription>{t("Proposal · sample record", "عرض · سجل تجريبي")}</SheetDescription>
          </SheetHeader>
          <SheetBody>
            <dl className="grid gap-4 text-md">
              {[
                [t("Status", "الحالة"), t("Sent", "أُرسل")],
                [t("Sent", "أُرسل في"), t("02 Oct", "02 أكتوبر")],
                [t("Pages", "الصفحات"), "12"],
                [t("Languages", "اللغات"), t("English, Arabic", "الإنجليزية، العربية")],
              ].map(([k, v]) => (
                <div key={k} className="flex justify-between gap-4 border-b border-border-subtle pb-3">
                  <dt className="text-muted-foreground">{k}</dt>
                  <dd className="font-medium">{v}</dd>
                </div>
              ))}
            </dl>
          </SheetBody>
          <SheetFooter>
            <Button variant="outline" onClick={() => setDetails(false)}>
              {t("Close", "إغلاق")}
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      <AlertDialog open={confirm} onOpenChange={setConfirm}>
        <AlertDialogContent dir={dir}>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("Delete this proposal?", "حذف هذا العرض؟")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t(
                "On the board this only hides the sample row. In the admin, a delete is permanent.",
                "على اللوحة يخفي هذا الصف التجريبي فقط. في لوحة الإدارة الحذف نهائي.",
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("Cancel", "إلغاء")}</AlertDialogCancel>
            <AlertDialogAction onClick={remove}>{t("Delete", "حذف")}</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Widget>
  );
}

const SLOTS = [
  { id: "sun", en: "Sunday · 11:00", ar: "الأحد · 11:00" },
  { id: "mon", en: "Monday · 14:00", ar: "الاثنين · 14:00" },
  { id: "tue", en: "Tuesday · 10:30", ar: "الثلاثاء · 10:30" },
] as const;

/** A short task on a phone: the drawer rises from the bottom, one choice, then Done. */
export function DrawerWidget(): React.ReactElement {
  const t = useT();
  const dir = useDir();
  const [slot, setSlot] = useState<(typeof SLOTS)[number]["id"]>("sun");
  const current = SLOTS.find((s) => s.id === slot) ?? SLOTS[0];
  return (
    <Widget
      title={t("Call time", "موعد المكالمة")}
      description={t("Drawer — the phone's bottom panel", "درج — اللوح السفلي للهاتف")}
      uses={["drawer"]}
      use="A short task on a phone that keeps the page behind it: one choice, then Done. It drags down to close."
      avoid="A long form in a drawer, or a drawer on a wide screen where a menu or a sheet fits."
    >
      <div className="flex items-center justify-between gap-3">
        <p className="text-md font-medium tabular-nums">{t(current.en, current.ar)}</p>
        <Drawer>
          <DrawerTrigger asChild>
            <Button variant="outline" size="sm">
              {t("Change", "تغيير")}
            </Button>
          </DrawerTrigger>
          <DrawerContent dir={dir}>
            <div className="mx-auto w-full max-w-sm">
              <DrawerHeader>
                <DrawerTitle>{t("Pick a time", "اختر موعدًا")}</DrawerTitle>
                <DrawerDescription>{t("Times are shown in your own time zone.", "المواعيد معروضة بتوقيتك.")}</DrawerDescription>
              </DrawerHeader>
              <ul className="grid gap-2 px-4">
                {SLOTS.map((s) => {
                  const active = s.id === slot;
                  return (
                    <li key={s.id}>
                      <button
                        type="button"
                        aria-pressed={active}
                        onClick={() => setSlot(s.id)}
                        className={cn(
                          "flex w-full items-center justify-between rounded-ctl-xl border px-4 py-3 text-start text-md tabular-nums transition-colors duration-(--motion-hover)",
                          active ? "border-foreground/45 bg-foreground/6" : "border-border-subtle hover:border-foreground/45",
                        )}
                      >
                        {t(s.en, s.ar)}
                        {active && <Check className="size-4" aria-hidden />}
                      </button>
                    </li>
                  );
                })}
              </ul>
              <DrawerFooter>
                <DrawerClose asChild>
                  <Button variant="brand">{t("Done", "تم")}</Button>
                </DrawerClose>
              </DrawerFooter>
            </div>
          </DrawerContent>
        </Drawer>
      </div>
    </Widget>
  );
}

export function FaqWidget(): React.ReactElement {
  const t = useT();
  const dir = useDir();
  return (
    <Widget
      title={t("Questions", "أسئلة")}
      uses={["accordion"]}
      use="Questions with short answers, read one at a time. Hairlines between items, the plus turns when open."
      avoid="Hiding content people need in order to decide."
    >
      <Accordion type="single" collapsible defaultValue="own" dir={dir}>
        {[
          {
            id: "own",
            q: t("Who owns the code?", "من يملك الكود؟"),
            a: t("You do, once the final payment lands.", "أنت، بمجرد سداد الدفعة الأخيرة."),
          },
          {
            id: "time",
            q: t("How long does a build take?", "كم يستغرق البناء؟"),
            a: t("The estimate gives a range; the schedule fixes it at kick-off.", "التقدير يعطي مدى، والجدول يثبته عند البداية."),
          },
          {
            id: "after",
            q: t("What happens after launch?", "ماذا بعد الإطلاق؟"),
            a: t("A warranty period, then care if you want it.", "فترة ضمان، ثم الرعاية إن أردتها."),
          },
        ].map((item) => (
          <AccordionItem key={item.id} value={item.id}>
            <AccordionTrigger>{item.q}</AccordionTrigger>
            <AccordionContent>
              <p className="text-muted-foreground">{item.a}</p>
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
    </Widget>
  );
}
