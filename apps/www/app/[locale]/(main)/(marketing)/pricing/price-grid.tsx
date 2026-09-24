"use client";

import { PlanSummary } from "@/components/sections/plan-summary";
import { Eyebrow } from "@/components/ui/eyebrow";
import { MOTION, useSectionCardGrid } from "@/lib/motion";
import { getLenis } from "@/lib/motion/lenis-instance";
import { cn } from "@/lib/utils/utils";
import type {
  PriceCellView,
  PriceMatrixView,
  TierId,
  TierView,
} from "@repo/pricing-schema";
import { useTranslations } from "next-intl";
import { useId, useLayoutEffect, useRef, useState, type ReactNode } from "react";

/**
 * The service matrix drawn whole, with the four packages marked on it.
 *
 * A tier owns no price — it names one cell of this grid. Drawing the grid is
 * what makes that legible: the package sits among the cells around it, and the
 * cells nobody named are visibly published too. The named cells are the only
 * controls; selecting one opens its package in the readout.
 *
 * `md` and up render a real table (rows = what is built, columns = scope).
 * Below `md` each service becomes its own short list, and the readout opens
 * under the service that holds the selected package, so it is never a screen
 * away from the cell that opened it.
 */
export function PriceGrid({
  matrix,
  tiers,
}: {
  matrix: PriceMatrixView;
  tiers: readonly TierView[];
}) {
  const t = useTranslations("pricing");
  const baseId = useId();
  const hintId = `${baseId}-hint`;
  const readoutId = `${baseId}-readout`;

  const byId = new Map(tiers.map((tier) => [tier.id, tier]));
  const [selected, setSelected] = useState<TierId>(
    () => tiers.find((tier) => tier.highlight)?.id ?? tiers[0].id,
  );

  const tableRef = useSectionCardGrid<HTMLDivElement>({
    selector: "[data-cell]",
    stagger: MOTION.stagger.tight,
    delay: MOTION.section.element,
  });
  const listRef = useSectionCardGrid<HTMLDivElement>({
    selector: "[data-cell]",
    stagger: MOTION.stagger.tight,
    delay: MOTION.section.element,
  });

  // On a phone the readout moves to the service that holds the new package, so
  // content above the tapped cell can grow or shrink. Hold the tapped cell
  // where the visitor's finger left it rather than letting the page jump.
  const anchor = useRef<{ el: HTMLElement; top: number } | null>(null);
  useLayoutEffect(() => {
    const held = anchor.current;
    anchor.current = null;
    if (!held || !held.el.isConnected) return;
    const delta = held.el.getBoundingClientRect().top - held.top;
    if (Math.abs(delta) < 1) return;
    // Native scroll first — Lenis's own value can lag a touch scroll it did
    // not drive — then tell Lenis where the page now is.
    const target = window.scrollY + delta;
    window.scrollTo({ top: target, behavior: "instant" });
    getLenis()?.scrollTo(target, { immediate: true, force: true });
  }, [selected]);

  const select = (tierId: TierId, el: HTMLElement) => {
    anchor.current = { el, top: el.getBoundingClientRect().top };
    setSelected(tierId);
  };

  const bandLabel = (cell: PriceCellView) =>
    matrix.bands.find((band) => band.id === cell.complexityId)?.label ?? "";

  const coordinates = (tier: TierView): string => {
    for (const row of matrix.rows) {
      const cell = row.cells.find((c) => c.tierId === tier.id);
      if (cell) {
        return t("grid.coordinates", {
          service: row.name,
          band: bandLabel(cell),
        });
      }
    }
    return "";
  };

  const namedCell = (
    cell: PriceCellView & { tierId: TierId },
    layout: "table" | "list",
  ): ReactNode => {
    const tier = byId.get(cell.tierId);
    if (!tier) return null;
    const isSelected = cell.tierId === selected;

    return (
      <button
        type="button"
        data-cell
        aria-pressed={isSelected}
        aria-controls={readoutId}
        aria-describedby={hintId}
        onClick={(event) => select(cell.tierId, event.currentTarget)}
        className={cn(
          "group w-full rounded-ctl-xl border text-start transition-colors duration-(--motion-hover) ease-smooth focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 focus-visible:ring-offset-background",
          layout === "table"
            ? "flex h-full min-h-24 flex-col justify-between gap-3 px-3.5 py-3 lg:px-4"
            : "flex min-h-14 items-center justify-between gap-4 px-3 py-2.5",
          isSelected
            ? "border-brand bg-brand text-brand-foreground"
            : "border-brand bg-brand/[0.04] text-foreground hover:bg-brand/[0.1]",
        )}
      >
        {layout === "table" ? (
          <>
            <span
              className={cn(
                "text-xs font-medium leading-snug md:text-[0.8125rem]",
                isSelected ? "text-brand-foreground" : "text-brand-text",
              )}
            >
              {tier.buyerLabel}
            </span>
            <CellFigures cell={cell} inverted={isSelected} />
          </>
        ) : (
          <>
            <span className="flex flex-col gap-0.5">
              <span className="text-sm">{bandLabel(cell)}</span>
              <span
                className={cn(
                  "text-xs font-medium leading-snug",
                  isSelected ? "text-brand-foreground" : "text-brand-text",
                )}
              >
                {tier.buyerLabel}
              </span>
            </span>
            <CellFigures cell={cell} inverted={isSelected} align="end" />
          </>
        )}
      </button>
    );
  };

  const plainCell = (cell: PriceCellView, layout: "table" | "list"): ReactNode => (
    <div
      data-cell
      className={cn(
        "rounded-ctl-xl border border-dashed border-foreground/20",
        layout === "table"
          ? "flex h-full min-h-24 flex-col justify-end px-3.5 py-3 lg:px-4"
          : "flex min-h-14 items-center justify-between gap-4 px-3 py-2.5",
      )}
    >
      {layout === "list" ? (
        <span className="text-sm text-muted-foreground">{bandLabel(cell)}</span>
      ) : null}
      <CellFigures cell={cell} muted align={layout === "list" ? "end" : "start"} />
    </div>
  );

  const cellFor = (cell: PriceCellView, layout: "table" | "list") =>
    cell.tierId
      ? namedCell({ ...cell, tierId: cell.tierId }, layout)
      : plainCell(cell, layout);

  const selectedTier = byId.get(selected) ?? tiers[0];

  return (
    <div>
      {/* The legend is drawn with the two cell kinds themselves, so it reads
          as a key to the grid rather than as an instruction. */}
      <ul className="mb-8 flex flex-wrap gap-x-8 gap-y-3 text-sm text-muted-foreground md:mb-10">
        <li id={hintId} className="flex items-center gap-2.5">
          <span aria-hidden className="h-4 w-6 shrink-0 rounded-ctl-xs border border-brand bg-brand/[0.04]" />
          {t("grid.legendNamed")}
        </li>
        <li className="flex items-center gap-2.5">
          <span aria-hidden className="h-4 w-6 shrink-0 rounded-ctl-xs border border-dashed border-foreground/35" />
          {t("grid.legendPlain")}
        </li>
      </ul>

      {/* md and up — the matrix as a table */}
      <div ref={tableRef} className="hidden md:block">
        <table className="w-full table-fixed border-separate border-spacing-0">
          <caption className="sr-only">{t("grid.caption")}</caption>
          <thead>
            <tr>
              <td className="w-[26%] lg:w-[28%]" />
              <th
                scope="colgroup"
                colSpan={matrix.bands.length}
                className="pb-3 text-start font-normal"
              >
                <Eyebrow className="m-0">{t("grid.columnsAxis")}</Eyebrow>
              </th>
            </tr>
            <tr>
              <th scope="col" className="pb-4 text-start align-bottom font-normal">
                <Eyebrow className="m-0">{t("grid.rowsAxis")}</Eyebrow>
              </th>
              {matrix.bands.map((band) => (
                <th
                  key={band.id}
                  scope="col"
                  className="border-t-2 border-foreground px-3.5 pt-3 pb-4 text-start align-bottom text-base font-medium text-foreground lg:px-4"
                >
                  {band.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {matrix.rows.map((row) => (
              <tr key={row.serviceId}>
                <th
                  scope="row"
                  className="border-t border-border-subtle py-4 pe-6 text-start align-top font-normal"
                >
                  <span className="block text-lg font-medium leading-tight text-foreground">
                    {row.name}
                  </span>
                  <span className="mt-1.5 hidden text-sm leading-snug text-muted-foreground lg:block">
                    {row.description}
                  </span>
                </th>
                {row.cells.map((cell) => (
                  <td
                    key={cell.complexityId}
                    className="h-px border-t border-border-subtle p-1.5 align-top"
                  >
                    {cellFor(cell, "table")}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>

        <div id={readoutId} aria-live="polite" className="mt-10 lg:mt-12">
          {tiers.map((tier) => (
            <Readout
              key={tier.id}
              tier={tier}
              coordinates={coordinates(tier)}
              hidden={tier.id !== selected}
              layout="wide"
            />
          ))}
        </div>
      </div>

      {/* below md — one short list per service, readout under its own cell */}
      <div ref={listRef} className="md:hidden">
        {matrix.rows.map((row) => {
          const holdsSelected = row.cells.some((cell) => cell.tierId === selected);
          return (
            <section
              key={row.serviceId}
              aria-labelledby={`${baseId}-${row.serviceId}`}
              className="border-t border-border-subtle py-5"
            >
              <h3
                id={`${baseId}-${row.serviceId}`}
                className="text-lg font-medium leading-tight text-foreground"
              >
                {row.name}
              </h3>
              <p className="mt-1 text-sm leading-snug text-muted-foreground">
                {row.description}
              </p>
              <ul className="mt-4 space-y-1.5">
                {row.cells.map((cell) => (
                  <li key={cell.complexityId}>{cellFor(cell, "list")}</li>
                ))}
              </ul>
              {holdsSelected ? (
                <div aria-live="polite" className="mt-4">
                  <Readout
                    tier={selectedTier}
                    coordinates={coordinates(selectedTier)}
                    hidden={false}
                    layout="stacked"
                  />
                </div>
              ) : null}
            </section>
          );
        })}
      </div>
    </div>
  );
}

function CellFigures({
  cell,
  inverted = false,
  muted = false,
  align = "start",
}: {
  cell: PriceCellView;
  inverted?: boolean;
  muted?: boolean;
  align?: "start" | "end";
}) {
  return (
    <span className={cn("flex flex-col gap-0.5", align === "end" && "items-end text-end")}>
      <span
        className={cn(
          "text-sm leading-snug tabular-nums text-pretty md:text-[0.9375rem]",
          inverted
            ? "text-brand-foreground"
            : muted
              ? "text-foreground/75"
              : "text-foreground",
        )}
      >
        {cell.priceLabel}
      </span>
      <span
        className={cn(
          "text-xs tabular-nums",
          inverted ? "text-brand-foreground" : "text-muted-foreground",
        )}
      >
        {cell.weeksLabel}
      </span>
    </span>
  );
}

function Readout({
  tier,
  coordinates,
  hidden,
  layout,
}: {
  tier: TierView;
  coordinates: string;
  hidden: boolean;
  layout: "wide" | "stacked";
}) {
  const t = useTranslations("pricing");

  return (
    <article
      hidden={hidden}
      aria-label={tier.buyerLabel}
      className={cn(
        "rounded-panel-sm border border-border-subtle bg-card motion-safe:animate-in motion-safe:fade-in-0 motion-safe:duration-(--motion-instant)",
        layout === "wide"
          ? "grid gap-8 p-6 md:p-8 lg:grid-cols-12 lg:gap-12 lg:p-10"
          : "p-5",
      )}
    >
      <div className={cn(layout === "wide" && "lg:col-span-5")}>
        <Eyebrow className="mb-4">{coordinates}</Eyebrow>
        <PlanSummary
          nameAs="h3"
          name={tier.buyerLabel}
          subtitle={tier.internalLabel}
          badge={t("recommended")}
          recommended={tier.highlight}
          price={tier.priceLabel}
          meta={{ label: tier.timelineLabel, value: tier.timelineValue }}
          bestFor={tier.idealFor}
          cta={{
            href: tier.estimatorHref,
            label: tier.ctaLabel,
            ariaLabel: `${tier.ctaLabel} - ${tier.buyerLabel}`,
          }}
        />
      </div>
      <div
        className={cn(
          layout === "wide"
            ? "lg:col-span-7 lg:border-s lg:border-border-subtle lg:ps-12"
            : "mt-6 border-t border-border-subtle pt-5",
        )}
      >
        <p className="text-xs text-foreground/70 md:text-sm">{t("grid.includes")}</p>
        <ul className="mt-3 space-y-2.5">
          {tier.features.map((feature) => (
            <li
              key={feature}
              className="flex items-start gap-2.5 text-sm leading-snug text-foreground md:text-[0.9375rem]"
            >
              <span aria-hidden className="mt-[0.5em] size-1.5 shrink-0 rounded-full bg-brand" />
              {feature}
            </li>
          ))}
        </ul>
        {tier.notIncluded ? (
          <div className="mt-6 border-t border-border-subtle pt-5">
            <p className="text-xs text-foreground/70 md:text-sm">{t("grid.notIncluded")}</p>
            <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
              {tier.notIncluded}
            </p>
          </div>
        ) : null}
      </div>
    </article>
  );
}
