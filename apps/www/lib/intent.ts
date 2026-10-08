// The visitor's stated intent: which situation they are in. Kept in
// localStorage beside first-touch attribution, with the same expiry and the
// same guarded access, and sent with every lead POST. Unlike the first touch,
// a later choice replaces an earlier one: intent is what they say now.

// No imports, so the server can share INTENT_SITUATIONS without pulling in
// client code.

/** The qualify step's situations plus "not sure yet"; the server maps each to ProjectSituation. */
export const INTENT_SITUATIONS = [
  "new-build",
  "replace-existing",
  "improve-existing",
  "unsure",
] as const;

export type IntentSituation = (typeof INTENT_SITUATIONS)[number];

const STORAGE_KEY = "altruvex.intent";
const EXPIRY_MS = 30 * 24 * 60 * 60 * 1000;

function isIntentSituation(value: unknown): value is IntentSituation {
  return INTENT_SITUATIONS.some((situation) => situation === value);
}

/** The stored situation, or null when there is none, it expired, or storage is blocked. */
function readIntent(): IntentSituation | null {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { situation?: unknown; savedAt?: unknown };
    const savedAt = typeof parsed.savedAt === "string" ? Date.parse(parsed.savedAt) : NaN;
    if (!Number.isFinite(savedAt) || Date.now() - savedAt > EXPIRY_MS) return null;
    return isIntentSituation(parsed.situation) ? parsed.situation : null;
  } catch {
    return null;
  }
}

/**
 * Records the visitor's choice. For the intent entry point (IntentLinks),
 * which also reports `intent_selected { situation }`.
 */
export function setIntent(situation: IntentSituation): void {
  try {
    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ situation, savedAt: new Date().toISOString() }),
    );
  } catch {
    // Blocked storage: the lead simply arrives without an intent.
  }
}

/** The fields a lead POST carries: the stored situation when there is one. */
export function intentPayload(): { situation?: IntentSituation } {
  const situation = readIntent();
  return situation ? { situation } : {};
}
