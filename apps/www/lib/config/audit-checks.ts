/**
 * The technical audit's check classes, and the weights that order them.
 *
 * Labels live in `messages/{en,ar}/serviceDetails.json` under
 * `serviceDetails.consulting.audit.register.checks.<id>`; only the weights are
 * here, because they are not copy — they produce the audit order, and the
 * register's whole argument is that the order is computed rather than asserted.
 *
 * `risk` and `effort` are 1–5 bands, not estimates of a particular system.
 * Nothing here describes a client; these are the classes an audit covers.
 */
interface AuditCheck {
  readonly id: string;
  /** Keys `…register.areas.<area>`. */
  readonly area: AuditArea;
  /** Business risk the finding class carries, 1–5. */
  readonly risk: number;
  /** Work to resolve it, 1–5. */
  readonly effort: number;
}

type AuditArea =
  | "architecture"
  | "performance"
  | "security"
  | "search"
  | "delivery"
  | "data"
  | "integrations"
  | "ownership";

/** Listed in the order a scan produces them — the register's "as found" pass. */
const AUDIT_CHECKS: readonly AuditCheck[] = [
  { id: "deployCoupling", area: "architecture", risk: 5, effort: 4 },
  { id: "dataOwnership", area: "architecture", risk: 5, effort: 5 },
  { id: "platformLockIn", area: "architecture", risk: 4, effort: 4 },
  { id: "webVitals", area: "performance", risk: 4, effort: 2 },
  { id: "serverResponse", area: "performance", risk: 4, effort: 3 },
  { id: "payloadWeight", area: "performance", risk: 3, effort: 1 },
  { id: "authSessions", area: "security", risk: 5, effort: 3 },
  { id: "exposedSurface", area: "security", risk: 5, effort: 2 },
  { id: "dependencies", area: "security", risk: 3, effort: 1 },
  { id: "indexability", area: "search", risk: 4, effort: 2 },
  { id: "structuredData", area: "search", risk: 2, effort: 1 },
  { id: "analytics", area: "search", risk: 2, effort: 2 },
  { id: "pipeline", area: "delivery", risk: 4, effort: 3 },
  { id: "environmentParity", area: "delivery", risk: 3, effort: 3 },
  { id: "contentModel", area: "data", risk: 4, effort: 4 },
  { id: "backupRestore", area: "data", risk: 5, effort: 2 },
  { id: "integrationFailure", area: "integrations", risk: 4, effort: 3 },
  { id: "accountControl", area: "ownership", risk: 5, effort: 1 },
] as const;

export type AuditOrder = "found" | "risk" | "sequence";

/** Risk removed per unit of effort — what the audit order sorts on. */
export function leverage(check: AuditCheck): number {
  return check.risk / check.effort;
}

/** The widest bar in the register, so every bar is drawn against one scale. */
export const MAX_LEVERAGE = Math.max(...AUDIT_CHECKS.map(leverage));

/**
 * The three passes over the same set.
 *
 * Only `sequence` makes the leverage bars fall monotonically — which is the
 * section's claim, drawn rather than stated. `found` keeps the scan order and
 * `risk` is worst-first, the list most audits stop at.
 */
export function orderChecks(order: AuditOrder): readonly AuditCheck[] {
  const rows = [...AUDIT_CHECKS];
  if (order === "risk") {
    return rows.sort((a, b) => b.risk - a.risk || b.effort - a.effort);
  }
  if (order === "sequence") {
    return rows.sort((a, b) => leverage(b) - leverage(a) || b.risk - a.risk);
  }
  return rows;
}

/**
 * How many leading rows the audit order marks as "start here". Marking them in
 * the other two passes would claim something those orderings do not support,
 * so the register only lights them under `sequence`.
 */
export const AUDIT_LEAD_ROWS = 4;

/**
 * The six channels a scan opens, and where its stops fall on each.
 *
 * `stops` are positions along the channel's scale (0–1) and `deep` marks the
 * ones an audit spends longest on. They describe the scan plan — its shape and
 * where the attention goes — and are explicitly not readings from anybody's
 * system. Labels key `…audit.channels.items.<id>`.
 */
interface ScanChannel {
  readonly id: string;
  readonly stops: readonly number[];
  readonly deep: readonly number[];
}

export const SCAN_CHANNELS: readonly ScanChannel[] = [
  { id: "architecture", stops: [0.12, 0.28, 0.34, 0.55, 0.71, 0.88], deep: [1, 4] },
  { id: "performance", stops: [0.08, 0.22, 0.41, 0.49, 0.63, 0.8, 0.94], deep: [2, 5] },
  { id: "security", stops: [0.15, 0.3, 0.52, 0.68, 0.85], deep: [0, 3] },
  { id: "searchData", stops: [0.1, 0.26, 0.38, 0.6, 0.77, 0.9], deep: [2] },
  { id: "delivery", stops: [0.18, 0.33, 0.47, 0.72, 0.86], deep: [1, 3] },
  { id: "ownership", stops: [0.2, 0.44, 0.58, 0.81], deep: [0] },
] as const;
