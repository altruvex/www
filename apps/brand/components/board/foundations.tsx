"use client";

import { AltruvexLogo, Separator, Surface } from "@repo/ui";
import { Check } from "lucide-react";
import { cn } from "@/lib/cn";
import { Cell, Widget, useT } from "./kit";

export const WORLDS = [
  { id: "blue", cls: "accent-world-blue", en: "Brand · trust", ar: "العلامة · الثقة" },
  { id: "orange", cls: "accent-world-orange", en: "Action · pricing", ar: "الفعل · التسعير" },
  { id: "green", cls: "accent-world-green", en: "Proof · live state", ar: "الدليل · الحالة الحية" },
  { id: "violet", cls: "accent-world-violet", en: "Interface design", ar: "تصميم الواجهات" },
  { id: "cyan", cls: "accent-world-cyan", en: "Consulting", ar: "الاستشارات" },
] as const;

export type World = (typeof WORLDS)[number]["id"];

const NEUTRALS = [
  { cls: "bg-background", name: "background" },
  { cls: "bg-card", name: "card" },
  { cls: "bg-surface", name: "surface" },
  { cls: "bg-muted", name: "muted" },
  { cls: "bg-foreground", name: "foreground" },
] as const;

const LEVELS = [
  { cls: "shadow-card", name: "card" },
  { cls: "shadow-card-lg", name: "card-lg" },
  { cls: "shadow-(--elev-1)", name: "elev-1" },
  { cls: "shadow-(--elev-2)", name: "elev-2" },
] as const;

export function LogoWidget(): React.ReactElement {
  const t = useT();
  return (
    <Widget
      title={t("Logo", "الشعار")}
      description={t("Full, icon and lockup", "كامل، أيقونة، وتوقيع")}
      uses={["logo"]}
      use="Full wordmark in headers and documents, the tile where space is square, the lockup where the brand signs off."
      avoid="Redrawing the tile or the wordmark by hand — import AltruvexLogo."
    >
      <div className="grid gap-5">
        <div className="flex h-24 items-center justify-center rounded-panel-sm bg-surface">
          <AltruvexLogo variant="full" size="md" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Cell label="icon">
            <AltruvexLogo variant="icon" size="lg" />
          </Cell>
          <Cell label="lockup">
            <AltruvexLogo variant="lockup" size="sm" />
          </Cell>
        </div>
      </div>
    </Widget>
  );
}

/** Lists the five worlds; choosing one recolours the whole canvas, like the World tile. */
export function WorldsWidget({ world, onWorld }: { world: World; onWorld: (next: World) => void }): React.ReactElement {
  const t = useT();
  return (
    <Widget
      title={t("Colour worlds", "عوالم الألوان")}
      description={t("One world per section", "عالم واحد لكل قسم")}
      uses={["globals", "tokens"]}
      use="One world per section, set with an accent-world class. Each colour has one job, named beside it."
      avoid="Two worlds in one section, or a world colour written inline."
    >
      <ul className="grid gap-1">
        {WORLDS.map((w) => {
          const active = w.id === world;
          return (
            <li key={w.id} className={w.cls}>
              <button
                type="button"
                aria-pressed={active}
                onClick={() => onWorld(w.id)}
                className={cn(
                  "flex w-full items-center gap-3 rounded-ctl-lg px-2 py-1.5 text-start transition-colors duration-(--motion-hover)",
                  active ? "bg-foreground/6" : "hover:bg-foreground/4",
                )}
              >
                <span className="size-7 shrink-0 rounded-ctl-sm bg-local-accent" aria-hidden />
                <span className="min-w-0 flex-1 truncate text-md text-foreground">{t(w.en, w.ar)}</span>
                {active ? (
                  <Check className="size-4 text-local-accent-text" aria-hidden />
                ) : (
                  <span className="text-meta text-muted-foreground">{w.id}</span>
                )}
              </button>
            </li>
          );
        })}
      </ul>
      <div className="mt-5 flex overflow-hidden rounded-ctl-lg border border-border-subtle">
        {NEUTRALS.map((n) => (
          <span key={n.name} title={n.name} className={cn(n.cls, "h-8 flex-1")} />
        ))}
      </div>
      <p className="mt-2 text-micro text-muted-foreground">{NEUTRALS.map((n) => n.name).join(" · ")}</p>
    </Widget>
  );
}

export function TypeWidget(): React.ReactElement {
  const t = useT();
  return (
    <Widget
      title={t("Type ladder", "سلم الخطوط")}
      description="Altruvex Sans"
      uses={["globals"]}
      use="One family, Altruvex Sans, in both scripts. Pick a step by role: heading, body, label. The ladder already carries the line height."
      avoid="An arbitrary text-[..] size — the audit flags it."
    >
      <div className="space-y-2.5">
        <p className="text-4xl font-medium tracking-tight">{t("Built to be owned", "مبني لتملكه")}</p>
        <p className="text-xl font-medium">{t("Section lead · xl", "مقدمة القسم · xl")}</p>
        <p className="text-body text-muted-foreground">{t("Body copy · body", "نص الفقرة · body")}</p>
        <p className="text-md text-muted-foreground">{t("Secondary · md", "نص ثانوي · md")}</p>
        <p className="text-meta text-muted-foreground">{t("Meta · meta", "بيانات · meta")}</p>
        <p className="eyebrow text-muted-foreground">{t("Eyebrow", "عنوان علوي")}</p>
      </div>
    </Widget>
  );
}

export function EdgesWidget(): React.ReactElement {
  const t = useT();
  return (
    <Widget
      title={t("Edge roles", "أدوار الحواف")}
      description={t("Container · separator · grid", "حاوية · فاصل · شبكة")}
      uses={["edges", "globals"]}
      use="Container: a hairline and a panel radius chosen by role. Separator: one side, no radius. Grid: outer border, inner hairlines, square inside. Controls take ctl-* by height."
      avoid="A card where a hairline would do, or a bigger radius because something is important."
    >
      <div className="grid grid-cols-3 gap-4">
        <Cell label="container">
          <span className="block h-14 w-full rounded-panel-sm border border-border-subtle bg-surface" />
        </Cell>
        <Cell label="separator">
          <span className="flex h-14 w-full items-center">
            <span className="block w-full border-t border-border-subtle" />
          </span>
        </Cell>
        <Cell label="grid">
          <span className="grid h-14 w-full grid-cols-2 overflow-hidden rounded-panel-sm border border-border-subtle">
            <span className="border-e border-b border-border-subtle" />
            <span className="border-b border-border-subtle" />
            <span className="border-e border-border-subtle" />
            <span />
          </span>
        </Cell>
      </div>
      <div className="mt-5 flex items-end justify-between gap-2 border-t border-border-subtle pt-5">
        {(["ctl-xs", "ctl-sm", "ctl", "ctl-lg", "ctl-xl"] as const).map((r, i) => (
          <Cell key={r} label={r}>
            <span
              className={cn(
                "block border border-foreground/45 bg-surface",
                ["size-6 rounded-ctl-xs", "size-8 rounded-ctl-sm", "size-10 rounded-ctl", "size-11 rounded-ctl-lg", "size-12 rounded-ctl-xl"][i],
              )}
            />
          </Cell>
        ))}
      </div>
    </Widget>
  );
}

export function ElevationWidget(): React.ReactElement {
  const t = useT();
  return (
    <Widget
      title={t("Elevation", "الارتفاع")}
      description={t("Four levels, no more", "أربعة مستويات فقط")}
      uses={["tokens"]}
      use="Four levels and no more. A shadow means something really sits above the page — a menu, a lifted card."
      avoid="A glow, a fifth level, or a shadow standing in for an edge."
    >
      <div className="grid grid-cols-2 gap-5">
        {LEVELS.map((l) => (
          <Cell key={l.name} label={l.name}>
            <span className={cn("block h-14 w-full rounded-panel-sm border border-border-subtle bg-card", l.cls)} />
          </Cell>
        ))}
      </div>
    </Widget>
  );
}

const SURFACES = ["default", "subtle", "elevated"] as const;

/** Every Surface variant. */
export function SurfacesWidget(): React.ReactElement {
  const t = useT();
  return (
    <Widget
      title={t("Surfaces", "الأسطح")}
      description={t("Surface variants and the separator", "أنواع السطح والفاصل")}
      uses={["surface", "separator"]}
      use="Surface is the container role as a component: default and subtle for panels, elevated only for something that lifts. Separator is the one-sided edge between groups."
      avoid="A surface inside a surface."
    >
      <div className="grid grid-cols-3 gap-3">
        {SURFACES.map((v) => (
          <Cell key={v} label={v}>
            <Surface variant={v} className="h-14 w-full" />
          </Cell>
        ))}
      </div>
      <Separator className="my-5" />
      <div className="flex h-5 items-center gap-3 text-meta text-muted-foreground">
        <span>{t("Brief", "الموجز")}</span>
        <Separator orientation="vertical" />
        <span>{t("Design", "التصميم")}</span>
        <Separator orientation="vertical" />
        <span>{t("Build", "البناء")}</span>
      </div>
    </Widget>
  );
}
