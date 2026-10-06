"use client";

import { useState } from "react";

export interface MotionToken {
  name: string;
  value: string;
  where: string;
  href: string;
}

/**
 * Plays each duration (with the default ease) and each ease (at --motion-base) side by side.
 * Under prefers-reduced-motion the dots jump without travelling.
 */
export function MotionDemo({
  durations,
  eases,
}: {
  durations: MotionToken[];
  eases: MotionToken[];
}): React.ReactElement {
  const [on, setOn] = useState(false);

  const row = (t: MotionToken, transition: string): React.ReactElement => (
    <li key={t.name} className="grid grid-cols-[minmax(0,11rem)_minmax(0,1fr)] items-center gap-4 border-b border-border-subtle py-3 sm:grid-cols-[11rem_9rem_minmax(0,1fr)]">
      <span className="min-w-0">
        <code className="block truncate text-md font-medium">{t.name}</code>
        <a href={t.href} className="text-meta text-muted-foreground underline decoration-border-mid underline-offset-2 hover:text-foreground">
          {t.where}
        </a>
      </span>
      <span className="hidden truncate text-meta text-muted-foreground tabular-nums sm:block">{t.value}</span>
      <span className="relative h-3 rounded-full bg-foreground/8">
        <span
          className="absolute top-0 size-3 rounded-full bg-foreground motion-reduce:transition-none"
          style={{ transition: transition, insetInlineStart: on ? "calc(100% - 0.75rem)" : "0" }}
        />
      </span>
    </li>
  );

  return (
    <div>
      <button
        type="button"
        onClick={() => setOn((v) => !v)}
        className="mb-8 inline-flex min-h-11 items-center rounded-full bg-brand px-6 text-sm font-medium text-brand-foreground transition-colors duration-(--motion-hover) hover:bg-brand-hover"
      >
        {on ? "Play back" : "Play"}
      </button>
      <h3 className="mb-4">Durations</h3>
      <ul className="mb-14 border-t border-border-subtle">
        {durations.map((t) => row(t, `inset-inline-start var(${t.name}) var(--ease-default)`))}
      </ul>
      <h3 className="mb-4">Eases</h3>
      <ul className="border-t border-border-subtle">
        {eases.map((t) => row(t, `inset-inline-start var(--motion-base) var(${t.name})`))}
      </ul>
    </div>
  );
}
