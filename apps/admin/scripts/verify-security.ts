import { isAdminSession, requireAdminSession } from "../lib/require-admin";
import { mfaRequired } from "../lib/mfa";
import { can, permitted, resolveRole, toProductRole } from "../lib/rbac";
import { roleChangeRefusal } from "../lib/team-rules";
import { SIGN_LINK_DAYS, signLinkExpired, signLinkExpiry } from "../lib/sign-window";
import { httpUrl } from "../lib/http-url";
import { safeRedirectPath } from "../lib/safe-redirect";
import { NextRequest } from "next/server";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { CRON_JOBS } from "../lib/cron-jobs";
import { ALL_NAV_ITEMS, canSee } from "../lib/nav";
import { ROLES } from "../lib/rbac";
import { NAV_WIDER_THAN_GATE, pageDecision, ROUTE_GATES, rolesFor, type RouteGate } from "../lib/page-gate";
import { FALLBACK_ICON, iconForEvent, KNOWN_ACTIONS } from "../lib/activity-icons";

let failures = 0;
const check = (ok: boolean, what: string) => {
  console.log(`  ${ok ? "✓" : "✗"} ${what}`);
  if (!ok) failures++;
};

console.log("\nPost-login redirect (MED-01)");
{
  check(safeRedirectPath("/clients/abc") === "/clients/abc", "a same-origin path is kept");
  check(safeRedirectPath("/") === "/", "root is kept");
  check(safeRedirectPath(null) === "/", "missing value falls back to /");
  check(safeRedirectPath("") === "/", "empty value falls back to /");
  check(safeRedirectPath("https://evil.example/") === "/", "absolute URL is refused");
  check(safeRedirectPath("//evil.example/x") === "/", "protocol-relative URL is refused");
  check(safeRedirectPath("/\\evil.example") === "/", "backslash trick is refused");
  check(safeRedirectPath("javascript:alert(1)") === "/", "javascript: scheme is refused");
  check(safeRedirectPath("/x\r\nLocation: y") === "/", "CRLF is refused");
  check(safeRedirectPath("clients") === "/", "relative path without leading slash is refused");
}

console.log("\nURL fields (MED-04)");
{
  const accepts = (v: string) => httpUrl.safeParse(v).success;
  check(accepts("https://app.example.com/path?x=1"), "https URL accepted");
  check(accepts("http://localhost:3011"), "http URL accepted");
  check(!accepts("javascript:alert(1)"), "javascript: refused");
  check(!accepts("data:text/html,<script>1</script>"), "data: refused");
  check(!accepts("ftp://files.example.com"), "ftp: refused");
  check(!accepts("file:///etc/passwd"), "file: refused");
  check(!accepts("not a url"), "plain text refused");
  check(!accepts(`https://a.b/${"x".repeat(600)}`), "over 500 characters refused");
}

console.log("\nAdmin decision (HIGH-01)");
{
  check(!isAdminSession(null), "null session is not admin");
  check(!isAdminSession(undefined), "undefined session is not admin");
  check(!isAdminSession({}), "session without user is not admin");
  check(!isAdminSession({ user: {} }), "user without role is not admin");
  check(!isAdminSession({ user: { role: "USER" } }), "USER is not admin");
  check(!isAdminSession({ user: { role: "admin" } }), "role check is case-sensitive");
  check(isAdminSession({ user: { role: "ADMIN" } }), "ADMIN is admin");
  check(isAdminSession({ user: { role: "SUPERADMIN" } }), "SUPERADMIN is admin");
}

console.log("\nSign-link window (MED-03)");
{
  const now = new Date("2026-01-01T00:00:00.000Z");
  const day = 24 * 60 * 60 * 1000;
  check(
    signLinkExpiry(now).getTime() === now.getTime() + SIGN_LINK_DAYS * day,
    `a new link runs for ${SIGN_LINK_DAYS} days`,
  );
  check(
    !signLinkExpired({ signTokenExpiresAt: new Date(now.getTime() + day) }, now),
    "a link inside its window is live",
  );
  check(
    signLinkExpired({ signTokenExpiresAt: new Date(now.getTime() - 1) }, now),
    "a link past its window is refused",
  );
  check(
    !signLinkExpired({ signTokenExpiresAt: null }, now),
    "a row with no recorded expiry stays signable (rows predating the column)",
  );
}

console.log("\nTwo-factor enforcement (MED-08)");
{
  const saved = process.env.ADMIN_MFA_REQUIRED;
  delete process.env.ADMIN_MFA_REQUIRED;
  check(!mfaRequired(), "enrolment is optional (offered, skippable) when nothing is configured");
  process.env.ADMIN_MFA_REQUIRED = "true";
  check(mfaRequired(), '"true" makes enrolment a gate');
  process.env.ADMIN_MFA_REQUIRED = "yes";
  check(!mfaRequired(), 'only the exact value "true" turns the gate on');
  process.env.ADMIN_MFA_REQUIRED = "false";
  check(!mfaRequired(), '"false" leaves it optional');
  if (saved === undefined) delete process.env.ADMIN_MFA_REQUIRED;
  else process.env.ADMIN_MFA_REQUIRED = saved;
}

console.log("\nProduct role resolution (lib/rbac.ts)");
{
  check(toProductRole("SUPERADMIN") === "OWNER", "SUPERADMIN derives to Owner");
  check(toProductRole("ADMIN") === "ADMIN", "ADMIN derives to Admin");
  check(toProductRole("USER") === undefined, "USER derives to nothing");
  check(resolveRole({ role: "SUPERADMIN", opsRole: null }) === "OWNER", "null opsRole falls back to the derived role");
  check(resolveRole({ role: "ADMIN", opsRole: "FINANCE" }) === "FINANCE", "a set opsRole wins over the derived role");
  check(resolveRole({ role: "SUPERADMIN", opsRole: "VIEWER" }) === "VIEWER", "opsRole can narrow even a superadmin");
  check(resolveRole({ role: "ADMIN", opsRole: "ROOT" }) === "ADMIN", "an unknown opsRole is ignored, not trusted");
  check(resolveRole({ role: "USER", opsRole: "OWNER" }) === "OWNER", "resolution alone does not gate sign-in — the auth role does (proxy + layout)");
  check(resolveRole({}) === undefined, "no roles at all resolve to nothing");
  check(!can(undefined, "view", "client"), "no role may do nothing");
}

console.log("\nRoute capability decision (withAdmin { can })");
{
  check(permitted("VIEWER", undefined), "no requirement admits every admin (default unchanged)");
  check(permitted("VIEWER", []), "an empty requirement admits every admin");
  check(permitted("OWNER", ["delete", "payment"]), "Owner may delete a payment");
  check(!permitted("ADMIN", ["delete", "payment"]), "Admin may not delete a payment");
  check(permitted("FINANCE", ["edit", "payment"]), "Finance may edit a payment");
  check(!permitted("FINANCE", ["send", "proposal"]), "Finance may not send a proposal");
  check(permitted("SALES", [["view", "lead"], ["send", "proposal"]]), "several capabilities all held → admitted");
  check(!permitted("SALES", [["view", "lead"], ["view", "payment"]]), "several capabilities, one missing → refused");
  check(!permitted(undefined, ["view", "client"]), "no role is refused whatever is asked");
  check(!permitted("ADMIN", ["edit", "team"]), "Admin may not change roles");
  check(permitted("OWNER", ["edit", "team"]), "Owner may change roles");
  check(permitted("PM", ["edit", "incident"]), "PM may work an incident");
  check(!permitted("PM", ["delete", "incident"]), "PM may not delete an incident");
  check(!permitted("VIEWER", ["edit", "incident"]), "Viewer may only read incidents");
  check(!permitted("OWNER", ["create", "deployment"]), "nobody creates a deployment by hand — CI writes them");
  check(permitted("SALES", ["delete", "note"]), "Sales may take back a note they wrote");
  check(!permitted("SALES", ["delete", "client"]), "Sales still may not delete a client");
  check(permitted("VIEWER", ["delete", "notification"]), "every role may clear its own inbox");

  const vercel = JSON.parse(
    readFileSync(fileURLToPath(new URL("../vercel.json", import.meta.url)), "utf8"),
  ) as { crons?: { path: string; schedule: string }[] };
  const declared = vercel.crons ?? [];
  check(declared.length === CRON_JOBS.length, "lib/cron-jobs.ts lists every cron in vercel.json");
  for (const job of CRON_JOBS) {
    check(
      declared.some((c) => c.path === job.path && c.schedule === job.schedule),
      `${job.path} runs on "${job.schedule}" in vercel.json`,
    );
  }
}

console.log("\nRole change rules (lib/team-rules.ts)");
{
  const owners = 1;
  check(
    roleChangeRefusal({ actorId: "a", actorRole: "OWNER", targetId: "a", targetRole: "OWNER", next: "ADMIN", owners }) !== null,
    "you cannot change your own role",
  );
  check(
    roleChangeRefusal({ actorId: "a", actorRole: "ADMIN", targetId: "b", targetRole: "SALES", next: "PM", owners }) !== null,
    "an Admin cannot change roles at all",
  );
  check(
    roleChangeRefusal({ actorId: "a", actorRole: "OWNER", targetId: "b", targetRole: "OWNER", next: "ADMIN", owners }) !== null,
    "the last Owner cannot be demoted",
  );
  check(
    roleChangeRefusal({ actorId: "a", actorRole: "OWNER", targetId: "b", targetRole: "OWNER", next: "ADMIN", owners: 2 }) === null,
    "an Owner may be demoted when another remains",
  );
  check(
    roleChangeRefusal({ actorId: "a", actorRole: "OWNER", targetId: "b", targetRole: "SALES", next: "OWNER", owners }) === null,
    "an Owner may grant Owner",
  );
  check(
    roleChangeRefusal({ actorId: "a", actorRole: "OWNER", targetId: "b", targetRole: "SALES", next: "SALES", owners }) !== null,
    "no change is refused as a no-op",
  );
}

console.log("\nUnauthenticated request to the session gate (HIGH-01)");
{
  const anonymous = new NextRequest("http://localhost:3011/pipeline");
  const session = await requireAdminSession(anonymous);
  check(session === null, "no cookie → null (refused), with no database round-trip");
}

console.log("\nPage gate (lib/page-gate.ts) agrees with the nav and covers every route");
{
  const here = fileURLToPath(new URL(".", import.meta.url));
  const dashboard = join(here, "..", "app", "(dashboard)");

  const routes: string[] = [];
  const walk = (dir: string, segments: string[]) => {
    for (const name of readdirSync(dir)) {
      const full = join(dir, name);
      if (statSync(full).isDirectory()) {
        walk(full, name.startsWith("(") ? segments : [...segments, name]);
      } else if (name === "page.tsx") {
        routes.push(segments.length ? `/${segments.join("/")}` : "/");
      }
    }
  };
  walk(dashboard, []);
  const gated = new Set(Object.keys(ROUTE_GATES));
  check(routes.length > 0, "found the dashboard routes on disk");
  for (const route of routes) {
    check(gated.has(route), `ROUTE_GATES has a row for ${route}`);
  }
  for (const route of gated) {
    check(routes.includes(route), `ROUTE_GATES row ${route} is a real page`);
  }

  const wider = new Set<string>(NAV_WIDER_THAN_GATE);
  for (const item of ALL_NAV_ITEMS) {
    const gate = (ROUTE_GATES as Record<string, RouteGate | undefined>)[item.href];
    check(gate !== undefined, `nav item ${item.href} has a gate`);
    if (!gate) continue;
    const admitted = rolesFor(gate);
    const visible = ROLES.filter((role) => canSee(item, role));
    check(
      admitted.every((role) => visible.includes(role)),
      `${item.href}: the gate admits no role the nav hides it from`,
    );
    const refusedButShown = visible.filter((role) => !admitted.includes(role));
    if (wider.has(item.href)) {
      check(
        refusedButShown.length > 0,
        `${item.href}: still listed in NAV_WIDER_THAN_GATE for a reason (${refusedButShown.join(", ") || "none"})`,
      );
    } else {
      check(
        refusedButShown.length === 0,
        `${item.href}: every role that sees it in the nav passes its gate${refusedButShown.length ? ` (refused: ${refusedButShown.join(", ")})` : ""}`,
      );
    }
  }
  for (const href of wider) {
    check(ALL_NAV_ITEMS.some((i) => i.href === href), `NAV_WIDER_THAN_GATE entry ${href} is a nav item`);
  }

  check(!pageDecision(undefined, ["view", "client"]), "no role is refused everywhere");
  check(!pageDecision(undefined), "no role is refused even by an open page");
  check(pageDecision("VIEWER"), "an open page admits every role");
  check(pageDecision("FINANCE", ["view", "payment"], ["OWNER", "ADMIN", "FINANCE"]), "Finance passes Billing");
  check(!pageDecision("SALES", ["view", "payment"], ["OWNER", "ADMIN", "FINANCE"]), "Sales is refused Billing by the matrix");
  check(!pageDecision("FINANCE", ["view", "payment"], ["OWNER", "ADMIN"]), "a role allowlist refuses even a role the matrix admits");
  check(!pageDecision("VIEWER", ["view", "settings"], ["OWNER", "ADMIN"]), "Viewer is refused the audit log");
  check(pageDecision("ADMIN", ["view", "settings"], ["OWNER", "ADMIN"]), "Admin passes the audit log");
  check(!pageDecision("PM", ["view", "lead"]), "PM is refused Leads");
  check(!pageDecision("ADMIN", ["delete", "client"]), "Admin is refused a page that needs client delete");
  check(rolesFor(ROUTE_GATES["/"]).length === ROLES.length, "every role reaches Today");
  check(rolesFor(ROUTE_GATES["/team"]).join(",") === "OWNER,ADMIN", "Team is Owner and Admin only");
}

console.log("\nActivity icons (lib/activity-icons.ts) cover every action the system writes");
{
  const here = fileURLToPath(new URL(".", import.meta.url));
  const root = join(here, "..");
  const read = (rel: string) => readFileSync(join(root, rel), "utf8");

  const prefixes = [
    "auth", "client", "clientNote", "note", "submission", "transparencyLead", "proposal", "contract",
    "project", "task", "change_request", "subscription", "maintenanceSubscription", "maintenance_request",
    "maintenanceRequest", "service", "clientService", "product", "build", "deployment", "log", "incident",
    "payment", "pricing", "meeting", "user", "settings", "notification",
  ];
  const literal = new RegExp(`"(${prefixes.join("|")})\\.([a-z]+(?:_[a-z]+)*)"`, "g");
  const written = new Set<string>();
  const scan = (dir: string) => {
    for (const name of readdirSync(dir)) {
      const full = join(dir, name);
      if (statSync(full).isDirectory()) {
        if (name !== "node_modules" && name !== ".next") scan(full);
      } else if (/\.tsx?$/.test(name) && !full.includes("activity-icons")) {
        for (const match of readFileSync(full, "utf8").matchAll(literal)) written.add(match[0].slice(1, -1));
      }
    }
  };
  scan(join(root, "lib"));
  scan(join(root, "app"));
  scan(join(root, "components"));

  const schema = readFileSync(join(root, "..", "..", "packages", "database", "prisma", "schema.prisma"), "utf8");
  const enumValues = (name: string): string[] => {
    const block = schema.match(new RegExp(`enum ${name} \\{([^}]*)\\}`))?.[1] ?? "";
    return block
      .split("\n")
      .map((line) => line.trim())
      .filter((line) => /^[A-Z_]+$/.test(line));
  };
  for (const s of enumValues("BuildStatus")) written.add(`build.${s.toLowerCase()}`);
  for (const s of enumValues("DeploymentStatus")) written.add(`deployment.${s.toLowerCase()}`);
  for (const s of enumValues("MaintenanceSubscriptionStatus")) written.add(`subscription.${s.toLowerCase()}`);
  const registryKeys = [...read("lib/deletable.ts").matchAll(/^  ([a-zA-Z]+): \{$/gm)].map((m) => m[1]!);
  check(registryKeys.length >= 10, `read ${registryKeys.length} delete-registry keys from lib/deletable.ts`);
  for (const key of registryKeys) written.add(`${key}.deleted`);

  check(enumValues("BuildStatus").length === 5, "BuildStatus has its five states");
  check(written.size > 80, `collected ${written.size} actions from the mutation sites`);
  const known = new Set<string>(KNOWN_ACTIONS);
  const missing = [...written].filter((action) => !known.has(action)).sort();
  check(
    missing.length === 0,
    missing.length
      ? `every written action has its own icon — missing: ${missing.join(", ")}`
      : `every one of the ${written.size} written actions has its own icon`,
  );
  const generic = KNOWN_ACTIONS.filter((action) => iconForEvent(action) === FALLBACK_ICON);
  check(generic.length === 0, `no listed action renders the generic icon${generic.length ? ` (${generic.join(", ")})` : ""}`);
  check(iconForEvent("client.frobnicated") !== FALLBACK_ICON, "an unknown verb on a known entity gets the entity icon");
  check(iconForEvent("widget.created") !== FALLBACK_ICON, "a known verb on an unknown entity gets the verb icon");
  check(iconForEvent("widget.frobnicated", "contract") !== FALLBACK_ICON, "an unknown action falls back to the row's entity type");
  check(iconForEvent("widget.frobnicated") === FALLBACK_ICON, "only an unknown verb on an unknown entity is generic");
}

console.log(failures === 0 ? "\nverify:security — all checks passed." : `\nverify:security — ${failures} failure(s).`);
process.exit(failures === 0 ? 0 : 1);
