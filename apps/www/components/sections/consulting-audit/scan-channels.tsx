"use client";

import { Eyebrow } from "@/components/ui/eyebrow";
import { Num } from "@/components/ui/num";
import { SCAN_CHANNELS } from "@/lib/config/audit-checks";
import { cn } from "@/lib/utils/utils";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { AuditSection } from "./audit-section";

/**
 * "Six channels. One scan plan."
 *
 * Cyan is the consulting world because consulting is diagnosis read off an
 * instrument, so the channels are drawn as scales with the stops on them. The
 * marks are **the plan** — where the attention goes — and never readings from
 * anybody's system; the section says so on the page, because a diagram that
 * looked like live measurement would be the fake dashboard this site refuses.
 *
 * Selecting a channel reads out what is examined and what comes back, which is
 * the real scope copy the old two-column split used to carry as prose.
 */
export function ScanChannels() {
  const t = useTranslations("serviceDetails.consulting.audit.channels");
  const [active, setActive] = useState(0);

  const channel = SCAN_CHANNELS[active]!;
  const examines = t.raw(`items.${channel.id}.examines`) as string[];
  const returns = t.raw(`items.${channel.id}.returns`) as string[];

  return (
    <AuditSection
      id="scan-plan"
      titleId="consulting-channels-heading"
      eyebrow={t("eyebrow")}
      title={t("title")}
      titleAccent={t("titleAccent")}
      description={t("description")}
      note={t("honesty")}
    >
        <div className="grid gap-10 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)] lg:gap-14">
          <ul className="list-none border-t border-border-subtle">
            {SCAN_CHANNELS.map((item, index) => {
              const selected = index === active;
              return (
                <li key={item.id} className="border-b border-border-subtle">
                  <button
                    type="button"
                    aria-selected={selected}
                    role="tab"
                    onClick={() => setActive(index)}
                    onFocus={() => setActive(index)}
                    className="grid w-full grid-cols-[2.5rem_minmax(0,1fr)] gap-x-4 py-4 text-start focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <span className="eyebrow pt-2 text-muted-foreground">
                      <Num value={index + 1} pad={2} />
                    </span>
                    <span
                      className={cn(
                        "text-[clamp(1.15rem,2vw,1.6rem)] font-light tracking-[-0.02em] transition-colors duration-(--motion-hover) rtl:tracking-normal",
                        selected ? "text-foreground" : "text-muted-foreground",
                      )}
                    >
                      {t(`items.${item.id}.name`)}
                    </span>

                    {/* the channel's scale, and the stops the audit makes on it */}
                    <span className="relative col-start-2 mt-2 block h-6" aria-hidden>
                      <span
                        className={cn(
                          "absolute inset-x-0 bottom-3 block h-px transition-colors duration-(--motion-hover)",
                          selected ? "bg-local-accent" : "bg-border-subtle",
                        )}
                      />
                      {item.stops.map((stop, stopIndex) => (
                        <span
                          key={stop}
                          style={{ insetInlineStart: `${stop * 100}%` }}
                          className={cn(
                            "absolute bottom-1.5 block w-px origin-bottom transition-colors duration-(--motion-hover)",
                            item.deep.includes(stopIndex) ? "h-[22px] w-0.5" : "h-[13px]",
                            selected ? "bg-local-accent" : "bg-border-subtle",
                          )}
                        />
                      ))}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>

          <div className="self-start rounded-panel-md border border-border-subtle p-6 lg:sticky lg:top-24">
            <Eyebrow>{t("readoutLabel", { index: String(active + 1).padStart(2, "0") })}</Eyebrow>
            <h3 className="mt-2.5 text-[clamp(1.3rem,2.2vw,1.9rem)] font-light tracking-[-0.03em] text-foreground rtl:tracking-normal">
              {t(`items.${channel.id}.name`)}
            </h3>

            <Readout label={t("examinesLabel")} items={examines} />
            <Readout label={t("returnsLabel")} items={returns} />
          </div>
        </div>
    </AuditSection>
  );
}

function Readout({ label, items }: { label: string; items: string[] }) {
  return (
    <>
      <Eyebrow className="mt-6 mb-2.5">{label}</Eyebrow>
      <ul className="grid list-none gap-2.5">
        {items.map((item) => (
          <li key={item} className="flex gap-3 text-sm leading-relaxed text-muted-foreground">
            <span aria-hidden className="mt-2 size-[5px] shrink-0 rounded-full bg-local-accent" />
            {item}
          </li>
        ))}
      </ul>
    </>
  );
}
