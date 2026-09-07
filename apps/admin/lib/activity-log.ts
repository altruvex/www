import { prisma, type ActorKind, type Prisma } from "@repo/database";

/**
 * The write side of the audit trail (§12).
 *
 * Before this existed, `/activity` and `/audit` were projections over
 * `updatedAt`: they could say a proposal row changed at 14:02 but never who
 * changed it or what the value had been. That is not an audit log — it is a
 * list of timestamps. Events are now written at the mutation site.
 *
 * Three rules hold here:
 *
 *  1. **Recording never breaks the mutation.** A failed write is logged to the
 *     server and swallowed. Losing an audit line is bad; rolling back a signed
 *     contract because the audit insert deadlocked is worse.
 *  2. **Only changed fields are stored.** `diff()` drops unchanged keys, so
 *     `before`/`after` read as "status: DRAFT → SENT", not as two entire rows.
 *  3. **Secrets never enter the payload.** `redact()` is applied to every value
 *     on the way in, keyed on the field name.
 */

/** Field names whose values are replaced with a marker, never stored. */
const SECRET_KEYS =
  /token|secret|password|passwordhash|apikey|api_key|accesskey|access_token|signature|authorization|cookie|sessionid|privatekey|webhook/i;

const REDACTED = "[redacted]";

/** Values longer than this are truncated — an audit row is not a blob store. */
const MAX_VALUE_LENGTH = 512;

export type AuditValue = Prisma.InputJsonValue;

function redactValue(key: string, value: unknown): AuditValue {
  if (SECRET_KEYS.test(key)) return REDACTED;
  if (value == null) return null as unknown as AuditValue;
  if (value instanceof Date) return value.toISOString();
  if (typeof value === "string") {
    return value.length > MAX_VALUE_LENGTH
      ? `${value.slice(0, MAX_VALUE_LENGTH)}…`
      : value;
  }
  if (typeof value === "number" || typeof value === "boolean") return value;
  // Objects and arrays are stringified rather than nested: a diff is meant to
  // be read at a glance, and a deep tree in a table cell is not readable.
  try {
    const json = JSON.stringify(value);
    return json.length > MAX_VALUE_LENGTH ? `${json.slice(0, MAX_VALUE_LENGTH)}…` : json;
  } catch {
    return String(value);
  }
}

export function redactRecord(
  input: Record<string, unknown> | null | undefined,
): Record<string, AuditValue> | undefined {
  if (!input) return undefined;
  const out: Record<string, AuditValue> = {};
  for (const [key, value] of Object.entries(input)) {
    out[key] = redactValue(key, value);
  }
  return Object.keys(out).length > 0 ? out : undefined;
}

/**
 * Reduces a before/after pair to only the keys that actually differ.
 * Returns `null` when nothing changed, which callers use to skip the write —
 * a no-op save should not produce an audit line.
 */
export function diff(
  before: Record<string, unknown>,
  after: Record<string, unknown>,
): { before: Record<string, AuditValue>; after: Record<string, AuditValue> } | null {
  const changedBefore: Record<string, AuditValue> = {};
  const changedAfter: Record<string, AuditValue> = {};
  let changed = false;

  for (const key of new Set([...Object.keys(before), ...Object.keys(after)])) {
    const a = before[key];
    const b = after[key];
    if (a === b) continue;
    // Dates compare by value, not identity.
    if (a instanceof Date && b instanceof Date && a.getTime() === b.getTime()) continue;
    if (a == null && b == null) continue;
    changed = true;
    changedBefore[key] = redactValue(key, a);
    changedAfter[key] = redactValue(key, b);
  }

  return changed ? { before: changedBefore, after: changedAfter } : null;
}

export interface Actor {
  kind: ActorKind;
  id?: string | null;
  label: string;
}

/** The actor for anything a signed-in operator did. */
export function userActor(session: {
  user?: { id?: string; name?: string | null; email?: string | null } | null;
} | null): Actor {
  const user = session?.user;
  return {
    kind: "USER",
    id: user?.id ?? null,
    label: user?.name || user?.email || "Unknown user",
  };
}

export const systemActor = (label = "System"): Actor => ({ kind: "SYSTEM", label });

export const clientActor = (label: string): Actor => ({ kind: "CLIENT", label });

export const integrationActor = (label: string): Actor => ({
  kind: "INTEGRATION",
  label,
});

export interface RecordActivityInput {
  action: string;
  actor: Actor;
  entityType: string;
  entityId: string;
  entityLabel?: string | null;
  summary: string;
  before?: Record<string, unknown> | null;
  after?: Record<string, unknown> | null;
  metadata?: Record<string, unknown> | null;
}

/**
 * Writes one event. Never throws — see rule 1 above.
 *
 * Pass a transaction client as `tx` when the event must live or die with the
 * mutation (a contract signing, say); omit it for everything else so a slow
 * audit insert does not hold a business transaction open.
 */
export async function recordActivity(
  input: RecordActivityInput,
  tx?: Prisma.TransactionClient,
): Promise<void> {
  const db = tx ?? prisma;
  const before = redactRecord(input.before);
  const after = redactRecord(input.after);
  const metadata = redactRecord(input.metadata);
  try {
    await db.activityEvent.create({
      data: {
        action: input.action,
        actorKind: input.actor.kind,
        actorId: input.actor.kind === "USER" ? (input.actor.id ?? null) : null,
        actorLabel: input.actor.label,
        entityType: input.entityType,
        entityId: input.entityId,
        entityLabel: input.entityLabel ?? null,
        summary: input.summary,
        // Spread rather than pass `undefined`: an absent key leaves the column
        // NULL, which is what "this event carries no diff" should look like.
        ...(before ? { before } : {}),
        ...(after ? { after } : {}),
        ...(metadata ? { metadata } : {}),
      },
    });
  } catch (error) {
    console.error(`Activity write failed for ${input.action}`, error);
  }
}

/**
 * Records a field-level change, skipping the write when nothing moved.
 * Returns whether an event was written, which tests assert on.
 */
export async function recordChange(
  input: Omit<RecordActivityInput, "before" | "after"> & {
    before: Record<string, unknown>;
    after: Record<string, unknown>;
  },
  tx?: Prisma.TransactionClient,
): Promise<boolean> {
  const delta = diff(input.before, input.after);
  if (!delta) return false;
  await recordActivity({ ...input, before: delta.before, after: delta.after }, tx);
  return true;
}
