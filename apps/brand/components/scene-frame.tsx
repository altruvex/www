"use client";

import { useState } from "react";
import { cn } from "@/lib/cn";
import { announceChange } from "./live";

const WORLDS = ["blue", "orange", "green", "violet", "cyan"] as const;
type World = (typeof WORLDS)[number];

function Toggle<T extends string>({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: readonly T[];
  value: T;
  onChange: (v: T) => void;
}): React.ReactElement {
  return (
    <fieldset className="flex flex-wrap items-center gap-1">
      <legend className="sr-only">{label}</legend>
      <span className="me-2 text-meta text-muted-foreground">{label}</span>
      {options.map((o) => (
        <button
          key={o}
          type="button"
          aria-pressed={value === o}
          onClick={() => {
            onChange(o);
            announceChange();
          }}
          className={cn(
            "min-h-8 rounded-full border px-3 text-meta transition-colors duration-(--motion-hover)",
            value === o
              ? "border-foreground bg-foreground text-background"
              : "border-foreground/30 text-foreground/80 hover:border-foreground/60",
          )}
        >
          {o}
        </button>
      ))}
    </fieldset>
  );
}

/** Renders its children inside a chosen scene, world and direction — the way a section sits on the site. */
export function SceneFrame({
  children,
  rtl,
}: {
  children: React.ReactNode;
  rtl?: React.ReactNode;
}): React.ReactElement {
  const [scene, setScene] = useState<"light" | "inverted">("light");
  const [world, setWorld] = useState<World>("blue");
  const [dir, setDir] = useState<"ltr" | "rtl">("ltr");

  return (
    <div className="overflow-hidden rounded-panel-md border border-border-subtle">
      <div className="flex flex-wrap gap-x-6 gap-y-3 border-b border-border-subtle px-5 py-4">
        <Toggle label="Scene" options={["light", "inverted"] as const} value={scene} onChange={setScene} />
        <Toggle label="World" options={WORLDS} value={world} onChange={setWorld} />
        {rtl && <Toggle label="Direction" options={["ltr", "rtl"] as const} value={dir} onChange={setDir} />}
      </div>
      <div
        data-scene={scene === "inverted" ? "inverted" : undefined}
        dir={dir}
        lang={dir === "rtl" ? "ar" : "en"}
        className={cn(`accent-world-${world}`, "bg-background px-5 py-14 text-foreground sm:px-10 lg:py-20")}
      >
        {dir === "rtl" && rtl ? rtl : children}
      </div>
    </div>
  );
}
