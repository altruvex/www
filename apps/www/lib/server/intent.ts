import { INTENT_SITUATIONS, type IntentSituation } from "@/lib/intent";
import { ProjectSituation } from "@repo/database";
import { z } from "zod";

const SITUATION: Record<IntentSituation, ProjectSituation> = {
  "new-build": ProjectSituation.NEW_BUILD,
  "replace-existing": ProjectSituation.REPLACE_EXISTING,
  "improve-existing": ProjectSituation.IMPROVE_EXISTING,
  unsure: ProjectSituation.UNSURE,
};

const intentSchema = z.object({ situation: z.enum(INTENT_SITUATIONS) });

/**
 * The visitor's stated situation from a lead POST body (lib/intent.ts), or
 * null when absent or not one of the known ids. Like attribution, a bad value
 * is dropped, never a reason to refuse the lead.
 */
export function situationFromBody(body: unknown): ProjectSituation | null {
  const parsed = intentSchema.safeParse(body);
  return parsed.success ? SITUATION[parsed.data.situation] : null;
}
