/**
 * The WhatsApp webhook's signature check, in isolation.
 *
 * This endpoint is exempt from the session guard in `proxy.ts` and writes
 * straight into the CRM — `handleInboundMessage` creates a `Client` and an
 * inbound message row. Its signature check is therefore the only thing standing
 * between a public URL and fabricated client records, and it is worth a test of
 * its own.
 *
 *   cd apps/admin && bun run verify:whatsapp
 *
 * The case that matters most is the missing-secret one. An earlier version
 * accepted every unsigned payload when `WHATSAPP_APP_SECRET` was absent and
 * left a comment asking for it to be set before real traffic — production then
 * ran open on exactly that gap for as long as nobody noticed. A comment is not
 * an enforcement; this is.
 */
import { createHmac } from "node:crypto";

import { isValidSignature } from "@/app/api/whatsapp/webhook/route";

let fail = 0;
const check = (ok: boolean, what: string) => {
  console.log(`  ${ok ? "✓" : "✗"} ${what}`);
  if (!ok) fail++;
};

const secret = "test-app-secret";
const body = JSON.stringify({ entry: [{ changes: [{ field: "messages" }] }] });
const sign = (payload: string, key: string) =>
  `sha256=${createHmac("sha256", key).update(payload).digest("hex")}`;

console.log("With a secret configured");
check(isValidSignature(body, sign(body, secret), secret, true), "a correct signature is accepted");
check(
  !isValidSignature(body, sign(body, "the-wrong-secret"), secret, true),
  "a signature from another secret is refused",
);
check(
  !isValidSignature(`${body} `, sign(body, secret), secret, true),
  "a tampered body is refused — the digest covers the bytes, not the shape",
);
check(!isValidSignature(body, null, secret, true), "a missing header is refused");
check(!isValidSignature(body, "sha256=deadbeef", secret, true), "a short digest is refused");
check(
  !isValidSignature(body, sign(body, secret).replace("sha256=", ""), secret, true),
  "a digest without the sha256= prefix is refused",
);
check(!isValidSignature(body, "sha256=", secret, true), "an empty digest is refused");

console.log("\nWith no secret configured");
// An empty string, not `undefined`: `undefined` triggers the parameter default
// and quietly reads the real secret out of the environment, so the three checks
// below would pass while testing nothing. `""` is falsy to the same `!appSecret`
// guard the handler uses, and cannot be substituted.
// The refusal is logged, and that log is worth asserting: a webhook that goes
// quiet is indistinguishable from a webhook nobody is calling, and the operator
// would hunt for the fault in Meta's delivery log rather than in one unset
// variable. Captured so a deliberate refusal does not read as a broken run.
const logged: string[] = [];
const realError = console.error;
console.error = (...args: unknown[]) => {
  logged.push(args.map(String).join(" "));
};
let refusedSigned: boolean;
let refusedUnsigned: boolean;
try {
  refusedSigned = !isValidSignature(body, "sha256=whatever", "", true);
  refusedUnsigned = !isValidSignature(body, null, "", true);
} finally {
  console.error = realError;
}
check(
  refusedSigned,
  "production refuses everything — an unverifiable webhook is an open write to the CRM",
);
check(refusedUnsigned, "production refuses an unsigned payload too");
check(
  logged.some((line) => line.includes("WHATSAPP_APP_SECRET")),
  "and says which variable is missing, so the fault is not hunted for in Meta's delivery log",
);
check(
  isValidSignature(body, null, "", false),
  "development still accepts, because Meta cannot reach a laptop and the handler has to be testable",
);

console.log(
  fail === 0 ? "\nwhatsapp signature — all checks passed.\n" : `\n${fail} check(s) FAILED.\n`,
);
process.exit(fail === 0 ? 0 : 1);
