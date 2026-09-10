/**
 * Transport selection and address validation, without sending anything.
 *
 * Two things fail silently here. Choosing the wrong transport sends from the
 * wrong address — a proposal that should have come from the studio's domain
 * arriving from a personal mailbox is not an error anything reports. And a
 * malformed address is refused by the provider *after* the request, so
 * catching it first is the difference between a clear message and a 422 nobody
 * can read.
 *
 *   cd apps/admin && bun run verify:email
 *
 * Actually delivering needs a real transport and a real inbox — send a proposal
 * by email and look at /email, which records what the transport answered rather
 * than claiming success.
 */
import { emailTransport, fromAddress, looksLikeAnAddress, replyToAddress } from "@/lib/email";
import { contractDraft, ensureLink, proposalDraft } from "@/lib/email-templates";

let fail = 0;
const check = (ok: boolean, what: string) => {
  console.log(`  ${ok ? "✓" : "✗"} ${what}`);
  if (!ok) fail++;
};

const KEYS = [
  "RESEND_API_KEY",
  "SMTP_HOST",
  "SMTP_USER",
  "SMTP_PASSWORD",
  "EMAIL_FROM",
  "EMAIL_REPLY_TO",
] as const;
const saved = Object.fromEntries(KEYS.map((k) => [k, process.env[k]]));
const clear = () => KEYS.forEach((k) => delete process.env[k]);

console.log("Transport selection");
try {
  clear();
  check(emailTransport() === "none", "with no credentials nothing pretends to send");

  process.env.SMTP_HOST = "smtp.gmail.com";
  check(emailTransport() === "none", "a host alone is not a transport");
  process.env.SMTP_USER = "altruvex@gmail.com";
  check(emailTransport() === "none", "a host and a user without a password is not either");
  process.env.SMTP_PASSWORD = "app-password";
  check(emailTransport() === "smtp", "all three make an SMTP transport");

  process.env.RESEND_API_KEY = "re_example";
  check(
    emailTransport() === "resend",
    "Resend wins when both are set — it sends from the studio's own domain",
  );

  console.log("\nFrom address");
  check(
    fromAddress() === "altruvex@gmail.com",
    "with no EMAIL_FROM, SMTP falls back to the mailbox that owns the credentials",
  );
  process.env.EMAIL_FROM = "hello@altruvex.com";
  check(fromAddress() === "hello@altruvex.com", "EMAIL_FROM wins when set");

  clear();
  let threw = false;
  try {
    fromAddress();
  } catch {
    threw = true;
  }
  check(threw, "with nothing configured there is no address to send as, and it says so");
} finally {
  clear();
  for (const [k, v] of Object.entries(saved)) if (v) process.env[k] = v;
}

console.log("\nReply-to");
{
  const saved = process.env.EMAIL_REPLY_TO;
  try {
    delete process.env.EMAIL_REPLY_TO;
    check(
      replyToAddress() === undefined,
      "unset means no reply-to header, not an empty one",
    );
    process.env.EMAIL_REPLY_TO = "   ";
    check(
      replyToAddress() === undefined,
      "whitespace is the same as unset — an empty Reply-To header is worse than none",
    );
    process.env.EMAIL_REPLY_TO = "  altruvex@gmail.com  ";
    check(
      replyToAddress() === "altruvex@gmail.com",
      "a pasted value is trimmed, because a stray space breaks the header",
    );
  } finally {
    if (saved) process.env.EMAIL_REPLY_TO = saved;
    else delete process.env.EMAIL_REPLY_TO;
  }
}

console.log("\nAddresses");
for (const good of [
  "ali@altruvex.com",
  "a@b.co",
  "first.last+tag@sub.domain.example",
  "ALI@ALTRUVEX.COM",
]) {
  check(looksLikeAnAddress(good), `${good} is deliverable`);
}
for (const [bad, why] of [
  ["", "empty"],
  ["ali", "no domain"],
  ["ali@", "nothing after the @"],
  ["@altruvex.com", "nothing before the @"],
  ["ali@@altruvex.com", "two @ signs"],
  ["ali@altruvex", "no dot in the domain"],
  ["ali@.com", "domain starts with a dot"],
  ["ali@altruvex.", "domain ends with a dot"],
  ["ali @altruvex.com", "contains a space"],
  ["ali@altruvex.com\nbcc: someone", "a newline — header injection"],
] as const) {
  check(!looksLikeAnAddress(bad), `"${bad}" is refused (${why})`);
}
check(
  !looksLikeAnAddress(`${"a".repeat(320)}@altruvex.com`),
  "an absurdly long address is refused before a request is spent on it",
);

console.log("\nDrafts");
{
  const link = "https://admin.altruvex.com/files/proposal-1.pdf";
  const draft = proposalDraft("Mohamed", link);
  check(draft.subject.length > 0, "a proposal draft has a subject");
  check(draft.body.includes("Hi Mohamed,"), "and greets the client by name");
  check(draft.body.includes(link), "and contains the document link");
  check(
    proposalDraft(null, link).body.includes("Hi there,"),
    "a client with no name still gets a greeting rather than a blank",
  );
  check(
    contractDraft("Mohamed", link).body.includes("do not forward"),
    "a contract draft says the signing link is personal",
  );
  check(
    proposalDraft("Mohamed", link).subject !== contractDraft("Mohamed", link).subject,
    "the two documents do not arrive under the same subject",
  );
}

console.log("\nThe link survives editing");
{
  // The body is editable, which means it is deletable. A proposal email whose
  // link was removed while rewriting the note above it tells a client something
  // is ready and gives them no way to see it — and nothing about it looks wrong
  // at the moment of sending.
  const link = "https://admin.altruvex.com/sign/abc123";
  check(
    ensureLink("Hi Mohamed, here it is: " + link, link) === "Hi Mohamed, here it is: " + link,
    "a body that already has the link is left exactly as written",
  );
  const rewritten = ensureLink("Hi Mohamed,\n\nAs discussed, I moved QA a week earlier.", link);
  check(rewritten.includes(link), "a body that lost the link gets it back");
  check(
    rewritten.startsWith("Hi Mohamed,"),
    "and the operator's own wording is kept ahead of it",
  );
  check(
    ensureLink("", link).includes(link),
    "an emptied body still carries the document",
  );
  check(
    (ensureLink(`start ${link} end`, link).match(new RegExp(link.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "g")) ?? []).length === 1,
    "the link is never duplicated",
  );
}

console.log(fail === 0 ? "\nemail — all checks passed.\n" : `\n${fail} check(s) FAILED.\n`);
process.exit(fail === 0 ? 0 : 1);
