/**
 * Lead context: the score reads the estimator's pace, next step and situation,
 * a contact answer still wins, exit-intent scores below a contact form, and
 * attribution is the first touch. Pure — needs no database.
 */
import { firstTouch, scoreLead, type ScoreInput } from "../lib/lead-score";

let failures = 0;
const check = (ok: boolean, what: string) => {
  console.log(`  ${ok ? "✓" : "✗"} ${what}`);
  if (!ok) failures++;
};

const base: ScoreInput = {
  source: "TRANSPARENCY_ESTIMATOR",
  hasCompany: false,
  hasEmail: false,
  proposalCount: 0,
  readProposal: false,
  inboundMessages: 0,
};
const score = (extra: Partial<ScoreInput>) => scoreLead({ ...base, ...extra });

console.log("\nEstimator timeline");
const none = score({});
const urgent = score({ estimatorTimeline: "urgent" });
const standard = score({ estimatorTimeline: "standard" });
const flexible = score({ estimatorTimeline: "flexible" });
check(urgent.score - none.score === 20, "urgent pace scores as IMMEDIATE (+20)");
check(standard.score - none.score === 8, "standard pace scores as PLANNING (+8)");
check(flexible.score - none.score === 3, "flexible pace scores as EXPLORING (+3)");
check(
  urgent.reasons.some((r) => r.includes("estimator pace urgent")),
  "the reason names the estimator pace",
);
check(score({ estimatorTimeline: "someday" }).score === none.score, "an unknown pace scores nothing");

console.log("\nContact timeline wins");
const both = score({ timeline: "EXPLORING", estimatorTimeline: "urgent" });
check(both.score - none.score === 3, "contact EXPLORING beats estimator urgent");
check(!both.reasons.some((r) => r.includes("estimator pace")), "no estimator pace reason when contact answered");

console.log("\nNext step and situation");
const consult = score({ estimatorNextStep: "consultation" });
check(consult.score - none.score === 4, "nextStep consultation adds 4");
check(consult.reasons.some((r) => r.includes("consultation")), "the reason says why");
check(score({ estimatorNextStep: "review" }).score === none.score, "nextStep review adds nothing");
check(score({ estimatorNextStep: null }).score === none.score, "a pre-migration null adds nothing");
check(score({ situation: "REPLACE_EXISTING" }).score - none.score === 6, "replacing a system adds 6");
check(score({ situation: "UNSURE" }).score === none.score, "UNSURE adds nothing");

console.log("\nSource points");
const exit = score({ source: "EXIT_INTENT" });
const contact = score({ source: "WEBSITE_CONTACT_FORM" });
check(exit.score < contact.score, "EXIT_INTENT scores below a contact form");
check(exit.score > 0, "EXIT_INTENT still scores");

console.log("\nFirst-touch attribution");
const early = new Date("2026-10-01T10:00:00Z");
const late = new Date("2026-10-05T10:00:00Z");
const sub = { at: late, record: "contact" };
const est = { at: early, record: "estimator" };
check(firstTouch(sub, est)?.origin === "estimator", "earlier estimator wins over later contact");
check(firstTouch(sub, est)?.record === "estimator", "and its record is the one returned");
check(
  firstTouch({ at: early, record: "contact" }, { at: late, record: "estimator" })?.origin ===
    "contact form",
  "earlier contact wins over later estimator",
);
check(
  firstTouch({ at: early, record: "contact" }, { at: early, record: "estimator" })?.origin ===
    "contact form",
  "a tie keeps the contact submission",
);
check(firstTouch(null, est)?.origin === "estimator", "estimator alone");
check(firstTouch(sub, null)?.origin === "contact form", "contact alone");
check(firstTouch(null, null) === null, "neither: no attribution");

console.log(failures ? `\n${failures} failed` : "\nAll lead-context checks passed");
process.exit(failures ? 1 : 0);
