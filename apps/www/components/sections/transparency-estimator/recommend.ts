import {
  isComplexityId,
  isServiceId,
  type ComplexityId,
  type ScopeNoteId,
  type ServiceId,
} from "@repo/pricing-schema";
import type { AnswerMap } from "./types";

/**
 * A preliminary read of a finished estimate: what the answers point to, what
 * moves the range, and which next step fits. Pure and rule-based — every line
 * traces back to an answer the visitor gave, so the panel never claims more
 * than the form knows.
 */

export type EstimateDriver =
  | { kind: "complexity" }
  | { kind: "brand" }
  | { kind: "timeline" }
  | { kind: "note"; id: ScopeNoteId };

export type EstimateNextStep = "consultation" | "review";

export interface EstimateRead {
  service: ServiceId;
  complexity: ComplexityId;
  drivers: EstimateDriver[];
  nextStep: EstimateNextStep;
}

const MAX_DRIVERS = 4;

/** Billed monthly after launch, so it never drives the build range. */
const NON_BUILD_NOTES: readonly ScopeNoteId[] = ["maintenance"];

/**
 * Answers that a written review alone cannot settle well: an application's
 * logic, the top complexity band, third-party payments or integrations, and an
 * urgent timeline all need a conversation before a figure is fixed.
 */
function needsConsultation(
  service: ServiceId,
  complexity: ComplexityId,
  scopeNotes: readonly ScopeNoteId[],
  timeline: string | null,
): boolean {
  return (
    service === "webapp" ||
    complexity === "premium" ||
    scopeNotes.includes("payments-integrations") ||
    timeline === "urgent"
  );
}

export function recommend(
  answers: AnswerMap,
  scopeNotes: readonly ScopeNoteId[],
): EstimateRead | null {
  const { projectType, complexity, brandIdentity, timeline } = answers;
  if (!projectType || !isServiceId(projectType)) return null;
  if (!complexity || !isComplexityId(complexity)) return null;

  const drivers: EstimateDriver[] = [];
  if (complexity === "premium") drivers.push({ kind: "complexity" });
  for (const id of scopeNotes) {
    if (!NON_BUILD_NOTES.includes(id)) drivers.push({ kind: "note", id });
  }
  if (brandIdentity === "scratch") drivers.push({ kind: "brand" });
  if (timeline === "urgent") drivers.push({ kind: "timeline" });

  return {
    service: projectType,
    complexity,
    drivers: drivers.slice(0, MAX_DRIVERS),
    nextStep: needsConsultation(projectType, complexity, scopeNotes, timeline)
      ? "consultation"
      : "review",
  };
}
