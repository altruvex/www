import {
  factorViews,
  isComplexityId,
  isServiceId,
  pricingCopy,
  scopeNoteViews,
} from "@repo/pricing-schema";

const FACTORS = factorViews("en");
const SCOPE_NOTES = scopeNoteViews("en");
const COPY = pricingCopy("en");

function optionLabel(
  groupId: "brand" | "content" | "timeline",
  id: string | null,
): string | null {
  if (!id) return null;
  const group = FACTORS.find((g) => g.id === groupId);
  return group?.options.find((o) => o.id === id)?.label ?? id;
}

export function brandLabel(id: string | null): string | null {
  return optionLabel("brand", id);
}

export function contentLabel(id: string | null): string | null {
  return optionLabel("content", id);
}

/** The estimator's delivery pace (urgent | standard | flexible). */
export function timelineLabel(id: string | null): string | null {
  return optionLabel("timeline", id);
}

/** The service name the visitor picked in the estimator ("Web App"). */
export function projectTypeName(id: string): string {
  return isServiceId(id) ? COPY.services[id].name : id;
}

/** The complexity band name the visitor saw ("Extensive"). */
export function complexityName(id: string): string {
  return isComplexityId(id) ? COPY.bands[id] : id;
}

export function scopeNoteNames(ids: readonly string[]): string[] {
  return ids.map((id) => SCOPE_NOTES.find((n) => n.id === id)?.name ?? id);
}

const NEXT_STEP_LABELS: Record<string, string> = {
  consultation: "A consultation first",
  review: "A written scope review",
};

/** The preliminary read's next step; null for a run stored before it was kept. */
export function nextStepLabel(id: string | null): string | null {
  if (!id) return null;
  return NEXT_STEP_LABELS[id] ?? id;
}

/**
 * What drove the range, from the stored driver ids: "complexity", "brand",
 * "timeline", or a scope-note id. Labels reuse the pricing vocabulary; an id
 * this map does not know is shown as stored.
 */
export function driverNames(ids: readonly string[]): string[] {
  return ids.map((raw) => {
    const id = raw.startsWith("note:") ? raw.slice(5) : raw;
    if (id === "complexity") return `${COPY.bands.premium} complexity`;
    if (id === "brand") return brandLabel("scratch") ?? id;
    if (id === "timeline") return `${timelineLabel("urgent")} delivery`;
    return scopeNoteNames([id])[0];
  });
}
