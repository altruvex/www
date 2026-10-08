// Pure check of the phone rule every lead goes through (no database).
// The stored shape must agree with whatsappNumber, and every typed shape of
// one number must share a match key so a returning lead never becomes a
// second client.
import { canonicalPhone, phoneMatchKeys } from "@repo/database";
import { whatsappNumber } from "../lib/service-reminder";

let failures = 0;
const check = (ok: boolean, what: string) => {
  if (ok) {
    console.log(`  ok   ${what}`);
  } else {
    failures += 1;
    console.log(`  FAIL ${what}`);
  }
};

const canonical: Array<[string, string]> = [
  ["01000000877", "201000000877"],
  ["0100 000 0877", "201000000877"],
  ["+201000000877", "201000000877"],
  ["00201000000877", "201000000877"],
  ["201000000877", "201000000877"],
  ["+20 100 000 0877", "201000000877"],
  ["+44 7911 123456", "447911123456"],
  ["07911123456", "07911123456"],
  ["00971501234567", "971501234567"],
];

console.log("canonicalPhone");
for (const [raw, want] of canonical) {
  const got = canonicalPhone(raw);
  check(got === want, `${JSON.stringify(raw)} -> ${got} (want ${want})`);
}

console.log("agrees with whatsappNumber where that names a number");
for (const [raw] of canonical) {
  const wa = whatsappNumber(raw);
  if (wa === null) continue;
  check(wa === canonicalPhone(raw), `${JSON.stringify(raw)}: whatsapp ${wa}`);
}

console.log("phoneMatchKeys");
const egypt = phoneMatchKeys("201000000877");
check(egypt.includes("201000000877"), "stored E.164 keys include itself");
check(egypt.includes("01000000877"), "stored E.164 keys include the legacy local form");
check(egypt.includes("00201000000877"), "stored E.164 keys include the 00 form");
const typed = phoneMatchKeys("0100 000 0877");
check(typed.includes("01000000877"), "local typing keys include its plain digits");
check(typed.includes("201000000877"), "local typing keys include the canonical form");
const plus = new Set(phoneMatchKeys("+20 100 000 0877"));
check(
  phoneMatchKeys("01000000877").some((k) => plus.has(k)),
  `"+20 100 000 0877" and "01000000877" share a key`,
);
const uk = phoneMatchKeys("07911123456");
check(
  uk.every((k) => !k.startsWith("20") && !k.startsWith("44")),
  "a local non-Egyptian number never gains a country",
);
check(phoneMatchKeys("").length === 0 && canonicalPhone(" () ") === "", "empty input has no keys");

if (failures > 0) {
  console.log(`\n${failures} check(s) failed`);
  process.exit(1);
}
console.log("\nall phone-match checks passed");
