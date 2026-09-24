"use client";

import { Num } from "@/components/ui/num";
import {
  AUDIT_LEAD_ROWS,
  leverage,
  MAX_LEVERAGE,
  orderChecks,
  type AuditOrder,
} from "@/lib/config/audit-checks";
import { cn } from "@/lib/utils/utils";
import { useTranslations } from "next-intl";
import { useCallback, useEffect, useRef, useState } from "react";
import { AuditSection } from "./audit-section";

const ORDERS: readonly AuditOrder[] = ["found", "risk", "sequence"];

/**
 * "The order is the product."
 *
 * Eighteen check classes, three passes over the same set. The bar is
 * *leverage* — risk removed per unit of effort — which is also what the audit
 * order sorts on, so the bars only fall as a clean staircase under that one
 * ordering. The section proves its claim instead of asserting it; change the
 * axis and watch the staircase break.
 *
 * The rank is the protagonist, not the text, because the claim is about
 * ordering. The area is a suffix on the row rather than a column: grouped by
 * area it stutters down the page, and it is meaningless in two of the three
 * passes anyway.
 */
export function FindingsRegister() {
  const t = useTranslations("serviceDetails.consulting.audit.register");
  const [order, setOrder] = useState<AuditOrder>("found");
  const listRef = useRef<HTMLOListElement>(null);
  const positions = useRef<Map<string, number>>(new Map());

  const rows = orderChecks(order);

  /* FLIP: measure before the re-order paints, then play each row back from
     where it was. Without this the register cuts to the new order and the
     argument — that these are the same rows, re-sequenced — is lost. */
  const measure = useCallback(() => {
    const list = listRef.current;
    if (!list) return;
    const next = new Map<string, number>();
    for (const li of Array.from(list.children) as HTMLElement[]) {
      const id = li.dataset.id;
      if (id) next.set(id, li.getBoundingClientRect().top);
    }
    positions.current = next;
  }, []);

  useEffect(() => {
    const list = listRef.current;
    if (!list) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      measure();
      return;
    }
    for (const li of Array.from(list.children) as HTMLElement[]) {
      const id = li.dataset.id;
      const previous = id ? positions.current.get(id) : undefined;
      if (previous === undefined) continue;
      const delta = previous - li.getBoundingClientRect().top;
      if (!delta) continue;
      li.animate(
        [{ transform: `translateY(${delta}px)` }, { transform: "none" }],
        { duration: 620, easing: "cubic-bezier(0.23, 1, 0.32, 1)" },
      );
    }
    measure();
  }, [order, measure]);

  const leads = order === "sequence" ? AUDIT_LEAD_ROWS : 0;

  return (
    <AuditSection
      id="findings"
      titleId="consulting-register-heading"
      eyebrow={t("eyebrow")}
      title={t("title")}
      titleAccent={t("titleAccent")}
      description={t("description")}
      note={t("honesty")}
    >
      <div
        role="group"
        aria-label={t("axisLabel")}
        className="flex flex-wrap items-baseline gap-x-7 gap-y-3"
      >
        {ORDERS.map((key) => (
          <button
            key={key}
            type="button"
            aria-pressed={order === key}
            onClick={() => {
              measure();
              setOrder(key);
            }}
            className={cn(
              "border-b-2 pb-2 text-[clamp(1rem,1.5vw,1.25rem)] font-normal tracking-[-0.02em] transition-colors duration-(--motion-hover) rtl:tracking-normal",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
              order === key
                ? "border-local-accent text-foreground"
                : "border-transparent text-muted-foreground hover:text-foreground",
            )}
          >
            {t(`orders.${key}.label`)}
          </button>
        ))}
        {/* The axis caption takes its own line until there is room beside the
            controls — right-aligned in a 100px gap it wrapped into a ragged
            block that read as part of the table header. */}
        <span className="eyebrow w-full leading-relaxed text-muted-foreground lg:ms-auto lg:w-auto lg:max-w-[34ch] lg:text-end">
          {t(`orders.${order}.axis`)}
        </span>
      </div>

      <div
        aria-hidden
        className="mt-7 hidden grid-cols-[4.5rem_minmax(0,1fr)_minmax(0,20rem)] gap-7 border-b border-border-subtle pb-2.5 md:grid"
      >
        <span className="eyebrow text-muted-foreground">{t("columns.rank")}</span>
        <span className="eyebrow text-muted-foreground">{t("columns.check")}</span>
        <span className="eyebrow text-muted-foreground">{t("columns.leverage")}</span>
      </div>

      <ol ref={listRef} className="list-none">
        {rows.map((check, index) => {
          const lead = index < leads;
          return (
            <li
              key={check.id}
              data-id={check.id}
              className="grid grid-cols-[3rem_minmax(0,1fr)] items-center gap-x-7 gap-y-2.5 border-b border-border-subtle py-4 md:grid-cols-[4.5rem_minmax(0,1fr)_minmax(0,20rem)]"
            >
              <span
                className={cn(
                  "text-[clamp(1.5rem,2.3vw,2.05rem)] leading-none font-light tracking-[-0.03em] tabular-nums transition-colors duration-(--motion-base)",
                  lead ? "text-local-accent-text" : "text-muted-foreground",
                )}
              >
                <Num value={index + 1} pad={2} />
              </span>
              <span
                className={cn(
                  "text-[clamp(0.95rem,1.15vw,1.0625rem)] leading-snug",
                  lead ? "text-foreground" : "text-foreground/85",
                )}
              >
                {t(`checks.${check.id}`)}
                <span className="eyebrow ms-2.5 whitespace-nowrap text-muted-foreground">
                  {t(`areas.${check.area}`)}
                </span>
              </span>
              <span className="col-start-2 flex items-center gap-3 md:col-start-3">
                <span className="h-[7px] flex-1 overflow-hidden rounded-full bg-muted">
                  <span
                    className="block h-full rounded-full bg-local-accent transition-[inline-size] duration-(--motion-base) ease-(--ease-strong)"
                    style={{ inlineSize: `${(leverage(check) / MAX_LEVERAGE) * 100}%` }}
                  />
                </span>
                <span className="eyebrow whitespace-nowrap text-muted-foreground">
                  {t("weights", { risk: check.risk, effort: check.effort })}
                </span>
              </span>
            </li>
          );
        })}
      </ol>

      <p className="mt-5 max-w-[56ch] text-sm leading-relaxed text-muted-foreground">
        {t(`orders.${order}.verdict`)}
      </p>
    </AuditSection>
  );
}
