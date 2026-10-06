"use client";

import Link from "next/link";
import {
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@repo/ui";
import { ArrowUpRight, Eye, EyeOff, Moon, RotateCcw, Sun } from "lucide-react";
import { cn } from "@/lib/cn";
import { setDark, useDark } from "@/lib/theme";
import { WORLDS, type World } from "./foundations";
import type { Direction } from "./kit";

export type Scene = "page" | "inverted";

/*
 * The board's side panel. Each tile shows one setting and its current value; the specimen
 * tiles open a menu, the system tiles go to the page that measures that part of the system.
 * Nothing here changes the system itself — only how the canvas shows it.
 */

const TILE =
  "flex w-full min-w-40 items-center gap-3 rounded-ctl-xl border border-border-subtle bg-background px-3 py-2 text-start outline-none transition-colors duration-(--motion-hover) hover:border-foreground/45 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand data-[state=open]:border-foreground/45";

function TileText({ label, value }: { label: string; value: string }): React.ReactElement {
  return (
    <span className="min-w-0 flex-1">
      <span className="block text-micro text-muted-foreground">{label}</span>
      <span className="block truncate text-md font-medium text-foreground">{value}</span>
    </span>
  );
}

function Indicator({ children, className }: { children: React.ReactNode; className?: string }): React.ReactElement {
  return (
    <span
      className={cn(
        "flex size-7 shrink-0 items-center justify-center rounded-ctl-sm border border-border-subtle bg-surface text-meta text-muted-foreground [&_svg]:size-3.5",
        className,
      )}
      aria-hidden
    >
      {children}
    </span>
  );
}

interface Option<T extends string> {
  value: T;
  label: string;
}

function ChoiceTile<T extends string>({
  label,
  value,
  options,
  onChange,
  indicator,
}: {
  label: string;
  value: T;
  options: ReadonlyArray<Option<T>>;
  onChange: (next: T) => void;
  indicator: React.ReactNode;
}): React.ReactElement {
  const current = options.find((o) => o.value === value);
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button type="button" className={TILE}>
          <TileText label={label} value={current?.label ?? value} />
          {indicator}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent side="right" align="start" sideOffset={8} collisionPadding={12} className="min-w-48">
        <DropdownMenuLabel>{label}</DropdownMenuLabel>
        <DropdownMenuRadioGroup
          value={value}
          onValueChange={(next) => {
            const hit = options.find((o) => o.value === next);
            if (hit) onChange(hit.value);
          }}
        >
          {options.map((o) => (
            <DropdownMenuRadioItem key={o.value} value={o.value}>
              {o.label}
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function LinkTile({ href, label, value }: { href: string; label: string; value: string }): React.ReactElement {
  return (
    <Link href={href} className={TILE}>
      <TileText label={label} value={value} />
      <Indicator>
        <ArrowUpRight />
      </Indicator>
    </Link>
  );
}

const WORLD_OPTIONS = WORLDS.map((w) => ({ value: w.id, label: `${w.id[0].toUpperCase()}${w.id.slice(1)} · ${w.en}` }));

export function Customizer({
  dir,
  onDir,
  scene,
  onScene,
  world,
  onWorld,
  notes,
  onNotes,
  onReset,
}: {
  dir: Direction;
  onDir: (next: Direction) => void;
  scene: Scene;
  onScene: (next: Scene) => void;
  world: World;
  onWorld: (next: World) => void;
  notes: boolean;
  onNotes: (next: boolean) => void;
  onReset: () => void;
}): React.ReactElement {
  const dark = useDark();
  const worldClass = WORLDS.find((w) => w.id === world)?.cls;

  return (
    <aside
      aria-label="Board settings"
      className="flex shrink-0 flex-col gap-3 rounded-panel-md border border-border-subtle bg-card p-3 lg:w-64 lg:overflow-y-auto"
    >
      <header className="px-1 pt-1">
        <p className="text-meta tabular-nums text-muted-foreground">09</p>
        <h1 className="mt-1 text-xl font-medium tracking-tight">Component board</h1>
        <p className="mt-1.5 text-meta text-muted-foreground">
          This site&apos;s own system, live. Drag the canvas to move around; every widget works.
        </p>
      </header>

      <div className="flex gap-2 overflow-x-auto pb-1 lg:flex-col lg:overflow-visible lg:pb-0">
        <ChoiceTile<Direction>
          label="Language"
          value={dir}
          onChange={onDir}
          options={[
            { value: "ltr", label: "English" },
            { value: "rtl", label: "العربية" },
          ]}
          indicator={<Indicator>{dir === "rtl" ? "ع" : "Aa"}</Indicator>}
        />
        <ChoiceTile<"light" | "dark">
          label="Theme"
          value={dark ? "dark" : "light"}
          onChange={(next) => setDark(next === "dark")}
          options={[
            { value: "light", label: "Light" },
            { value: "dark", label: "Dark" },
          ]}
          indicator={<Indicator>{dark ? <Moon /> : <Sun />}</Indicator>}
        />
        <ChoiceTile<Scene>
          label="Scene"
          value={scene}
          onChange={onScene}
          options={[
            { value: "page", label: "Page" },
            { value: "inverted", label: "Inverted" },
          ]}
          indicator={
            <Indicator className="overflow-hidden p-0">
              <span className={cn("size-full", scene === "inverted" ? "bg-foreground" : "bg-background")} />
            </Indicator>
          }
        />
        <ChoiceTile<World>
          label="World"
          value={world}
          onChange={onWorld}
          options={WORLD_OPTIONS}
          indicator={
            <Indicator className={worldClass}>
              <span className="size-3 rounded-full bg-local-accent" />
            </Indicator>
          }
        />
        <ChoiceTile<"hidden" | "shown">
          label="Usage notes"
          value={notes ? "shown" : "hidden"}
          onChange={(next) => onNotes(next === "shown")}
          options={[
            { value: "hidden", label: "Hidden" },
            { value: "shown", label: "Shown" },
          ]}
          indicator={<Indicator>{notes ? <Eye /> : <EyeOff />}</Indicator>}
        />
      </div>

      <div className="hidden flex-col gap-2 border-t border-border-subtle pt-3 lg:flex">
        <LinkTile href="/type" label="Font" value="Altruvex Sans" />
        <LinkTile href="/edges" label="Edges" value="ctl · panel" />
        <LinkTile href="/elevation" label="Elevation" value="4 levels" />
        <LinkTile href="/audit" label="Drift" value="Run the audit" />
      </div>

      <div className="mt-auto hidden lg:block">
        <Button variant="outline" className="w-full" onClick={onReset}>
          <RotateCcw />
          Reset
        </Button>
      </div>
    </aside>
  );
}
