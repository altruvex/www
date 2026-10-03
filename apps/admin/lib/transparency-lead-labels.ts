import { factorViews, scopeNoteViews } from "@repo/pricing-schema";

/**
 * Display labels for what a `TransparencyLead` row stores as ids.
 *
 * The estimator writes `brandIdentity`, `contentReadiness` and `scopeNotes`
 * as schema ids; the admin reads them back through the same copy the public
 * estimator showed, so the operator sees the words the buyer ticked. An id
 * the schema no longer knows is shown as itself rather than dropped — a lead
 * is a record of what was asked, and this never invents or hides an answer.
 */

const FACTORS = factorViews("en");
const SCOPE_NOTES = scopeNoteViews("en");

function optionLabel(groupId: "brand" | "content", id: string | null): string | null {
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

/** Old rows carry `[]` and read as no notes, not as an error. */
export function scopeNoteNames(ids: readonly string[]): string[] {
  return ids.map((id) => SCOPE_NOTES.find((n) => n.id === id)?.name ?? id);
}
