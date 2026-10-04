import assert from "node:assert/strict";
import { parsePhone, splitStoredPhone } from "../lib/dial-codes";

assert.equal(parsePhone("0100 123 4567", "EG").e164, "+201001234567");
assert.equal(parsePhone("+44 7911 123456", "EG").iso, "GB");
assert.equal(parsePhone("0044 7911 123456", "EG").e164, "+447911123456");
assert.equal(parsePhone("+1 684 555 0123", "EG").iso, "AS");
assert.equal(parsePhone("+1 415 555 0123", "EG").iso, "US");
assert.ok(parsePhone("12ab", "EG").error);
assert.ok(parsePhone("123", "EG").error);
assert.ok(parsePhone("+20 1234567890123456", "EG").error);
assert.equal(parsePhone("", "EG").error, null);
assert.deepEqual(splitStoredPhone("201001234567"), { iso: "EG", text: "1001234567" });
console.log("verify-phone: ok");
