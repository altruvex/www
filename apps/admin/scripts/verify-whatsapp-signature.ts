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
