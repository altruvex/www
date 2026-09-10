/**
 * What reaches the channel, and how it is written — checked without a webhook.
 *
 * The decisions here are the ones that make a notification channel useful or
 * useless: which events are worth interrupting somebody for, and whether a
 * client called `Smith & Sons <Holdings>` renders as a name or as broken markup.
 * Both fail silently — a channel full of noise still delivers, and mangled
 * markup still posts.
 *
 *   cd apps/admin && bun run verify:slack
 *
 * Delivery is proved too, against a local server standing in for the webhook:
 * that a curated event actually leaves the process, that a non-curated one sends
 * nothing at all, and that a rejected webhook never escapes into the mutation
 * that triggered it. Only the real channel needs a real webhook — that is what
 * the Send a test button on /integrations is for.
 */
import { createServer } from "node:http";
import type { AddressInfo } from "node:net";

import type { ActionItem } from "@/lib/action-center";
import {
  NOTIFIED_ACTIONS,
  buildDigestMessage,
  buildEventMessage,
  entityUrl,
  escapeMrkdwn,
  headlineFor,
  notifySlack,
  postToSlack,
  shouldNotify,
} from "@/lib/slack";

let fail = 0;
const check = (ok: boolean, what: string) => {
  console.log(`  ${ok ? "✓" : "✗"} ${what}`);
  if (!ok) fail++;
};

process.env.NEXT_PUBLIC_APP_URL = "https://admin.example.com";

console.log("What interrupts somebody");
for (const action of [
  "contract.signed",
  "incident.opened",
  "deployment.failed",
  "build.failed",
  "client.created",
  "payment.status_changed",
]) {
  check(shouldNotify(action), `${action} reaches the channel`);
}
for (const action of [
  "submission.viewed",
  "build.succeeded",
  "deployment.succeeded",
  "task.updated",
  "client.updated",
  "product.token_rotated",
  "settings.company_profile_updated",
  "meeting.status_changed",
]) {
  check(!shouldNotify(action), `${action} does not — the channel is not the audit log`);
}
check(shouldNotify("client.deleted"), "any deletion reaches the channel");
check(shouldNotify("contract.deleted"), "including one nobody added to the list by hand");

console.log("\nHeadlines");
check(headlineFor("contract.signed") === "Contract signed", "an action reads as a sentence");
check(
  headlineFor("maintenance_request.status_changed") === "Maintenance request status changed",
  "underscores and dots both become spaces",
);

console.log("\nEscaping");
check(escapeMrkdwn("Smith & Sons") === "Smith &amp; Sons", "an ampersand is escaped");
check(
  escapeMrkdwn("<Holdings>") === "&lt;Holdings&gt;",
  "angle brackets cannot open a fake link",
);
check(escapeMrkdwn("Acme *Ltd*") === "Acme *Ltd*", "nothing else is touched");

console.log("\nLinks");
check(
  entityUrl("contract", "abc") === "https://admin.example.com/contracts/abc",
  "an entity resolves to its screen",
);
check(entityUrl("payment", "abc") === "https://admin.example.com/payments", "a list-only entity resolves to the list");
check(entityUrl("nonsense", "abc") === null, "an unknown entity yields no link rather than a broken one");
delete process.env.NEXT_PUBLIC_APP_URL;
delete process.env.BETTER_AUTH_URL;
check(entityUrl("contract", "abc") === null, "with no app URL configured there is no link at all");
process.env.NEXT_PUBLIC_APP_URL = "https://admin.example.com";

console.log("\nEvent message");
const event = buildEventMessage({
  action: "contract.signed",
  actor: { kind: "USER", label: "Ali Abdelhadi" },
  entityType: "contract",
  entityId: "abc123",
  entityLabel: "Smith & Sons <Holdings>",
  summary: "Signed by Mohamed Adel",
});
const section = event.blocks[0]?.text?.text ?? "";
check(section.includes("Contract signed"), "the headline names the event");
check(section.includes("https://admin.example.com/contracts/abc123"), "the message links to the record");
check(section.includes("Smith &amp; Sons &lt;Holdings&gt;"), "the entity name is escaped inside the link");
check(!section.includes("<Holdings>"), "the raw angle brackets never reach Slack");
check(
  event.text.includes("Smith &amp; Sons &lt;Holdings&gt;"),
  "the phone-notification fallback is escaped too — it is what a client without blocks renders",
);
check(!event.text.includes("<Holdings>"), "and carries no raw markup either");
check(
  (event.blocks[1]?.elements?.[0]?.text ?? "").includes("Ali Abdelhadi"),
  "the actor is on the message, not just in the audit trail",
);

const unlabelled = buildEventMessage({
  action: "incident.opened",
  actor: { kind: "SYSTEM", label: "System" },
  entityType: "incident",
  entityId: "0123456789abcdef",
  summary: "Checkout is down",
});
check(
  (unlabelled.blocks[0]?.text?.text ?? "").includes("incident 01234567"),
  "an event with no label still names something a human can search for",
);

console.log("\nDigest");
const item = (n: number, ageDays = 0): ActionItem => ({
  id: `i${n}`,
  kind: "lead",
  icon: (() => null) as unknown as ActionItem["icon"],
  tone: "warning",
  title: `Item ${n}`,
  detail: "needs a human",
  href: "/leads",
  cta: "Open",
  score: 100 - n,
  ageDays,
});

const empty = buildDigestMessage([]);
check(
  (empty.blocks[0]?.text?.text ?? "").includes("Nothing needs a human"),
  "an empty action centre says so rather than posting a blank list",
);
check(empty.blocks.length === 1, "and carries no overflow footer");

const many = buildDigestMessage(Array.from({ length: 14 }, (_, i) => item(i + 1)));
const digest = many.blocks[0]?.text?.text ?? "";
check(digest.includes("Item 10"), "the first ten items are listed");
check(!digest.includes("Item 11"), "the eleventh is not — a message longer than a screen is unread");
check(
  (many.blocks[1]?.elements?.[0]?.text ?? "").includes("4 more"),
  "the count of what was left out is stated",
);
check(digest.includes("https://admin.example.com/leads"), "every line links back");

const aged = buildDigestMessage([item(1, 12)]);
check((aged.blocks[0]?.text?.text ?? "").includes("12d"), "staleness is shown when there is any");
check(!(buildDigestMessage([item(1, 0)]).blocks[0]?.text?.text ?? "").includes("0d"), "and not when there is none");

console.log("\nCuration size");
check(
  Object.keys(NOTIFIED_ACTIONS).length < 20,
  `the notified set stays small (${Object.keys(NOTIFIED_ACTIONS).length} actions)`,
);

console.log("\nDelivery");
{
  // A local stand-in for the webhook. Formatting can be asserted on a return
  // value; "does anything actually leave the process" cannot, and that is the
  // half that breaks when a guard is inverted.
  const received: unknown[] = [];
  let reject = false;
  const server = createServer((request, response) => {
    const chunks: Buffer[] = [];
    request.on("data", (chunk: Buffer) => chunks.push(chunk));
    request.on("end", () => {
      received.push(JSON.parse(Buffer.concat(chunks).toString("utf8")));
      response.writeHead(reject ? 400 : 200);
      response.end(reject ? "invalid_payload" : "ok");
    });
  });
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const port = (server.address() as AddressInfo).port;
  process.env.SLACK_WEBHOOK_URL = `http://127.0.0.1:${port}/hook`;

  try {
    await notifySlack({
      action: "contract.signed",
      actor: { kind: "USER", label: "Ali Abdelhadi" },
      entityType: "contract",
      entityId: "abc123",
      entityLabel: "Acme Ltd",
      summary: "Signed by Mohamed Adel",
    });
    check(received.length === 1, "a curated event is actually delivered");
    const payload = received[0] as { text: string; blocks: unknown[] };
    check(payload.text.includes("Contract signed"), "the delivered payload carries the headline");
    check(Array.isArray(payload.blocks) && payload.blocks.length === 2, "and its blocks");

    await notifySlack({
      action: "build.succeeded",
      actor: { kind: "INTEGRATION", label: "CI" },
      entityType: "build",
      entityId: "b1",
      summary: "Build #3 succeeded",
    });
    check(received.length === 1, "a non-curated event sends no request at all");

    reject = true;
    let escaped = false;
    // `notifySlack` logs the rejection it refuses to rethrow, and that log is
    // itself worth asserting: swallowing a failure silently and swallowing it
    // loudly look identical from the outside, and only one of them can be
    // debugged. Captured rather than printed so a deliberate failure does not
    // read as a broken test run.
    const logged: string[] = [];
    const realError = console.error;
    console.error = (...args: unknown[]) => {
      logged.push(args.map(String).join(" "));
    };
    try {
      await notifySlack({
        action: "incident.opened",
        actor: { kind: "SYSTEM", label: "System" },
        entityType: "incident",
        entityId: "i1",
        summary: "Checkout is down",
      });
    } catch {
      escaped = true;
    } finally {
      console.error = realError;
    }
    check(!escaped, "a rejected webhook never escapes notifySlack — the mutation stays safe");
    check(
      logged.some((line) => line.includes("incident.opened")),
      "and the rejection is logged rather than lost — a silent swallow cannot be debugged",
    );

    let reason = "";
    try {
      await postToSlack(buildDigestMessage([]));
    } catch (error) {
      reason = error instanceof Error ? error.message : String(error);
    }
    check(
      reason.includes("invalid_payload"),
      "the explicit path surfaces Slack's own reason instead of a generic failure",
    );
  } finally {
    await new Promise<void>((resolve) => server.close(() => resolve()));
    delete process.env.SLACK_WEBHOOK_URL;
  }
}

console.log(fail === 0 ? "\nslack — all checks passed.\n" : `\n${fail} check(s) FAILED.\n`);
process.exit(fail === 0 ? 0 : 1);
