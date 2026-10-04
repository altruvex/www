import { factorViews, scopeNoteViews } from "@repo/pricing-schema";

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

export function scopeNoteNames(ids: readonly string[]): string[] {
  return ids.map((id) => SCOPE_NOTES.find((n) => n.id === id)?.name ?? id);
}
