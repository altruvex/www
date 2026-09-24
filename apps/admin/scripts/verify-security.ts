/**
 * Security regression checks that need no database and no running server.
 *
 * Each case pins a fix from SECURITY_AUDIT.md so it cannot quietly come back:
 *
 *   - the post-login redirect only ever stays on this origin (MED-01)
 *   - a URL field never accepts a scheme the admin would render as `<a href>` (MED-04)
 *   - "is this an admin" is one decision, and it refuses a missing or
 *     non-admin session (HIGH-01 — the layout gate calls this)
 *   - an unauthenticated request to the page gate is refused without a
 *     database (HIGH-01)
 *
 *   cd apps/admin && bun run verify:security
 */
import { isAdminSession, requireAdminSession } from "../lib/require-admin";
import { mfaRequired } from "../lib/mfa";
import { SIGN_LINK_DAYS, signLinkExpired, signLinkExpiry } from "../lib/sign-window";
import { httpUrl } from "../lib/http-url";
import { safeRedirectPath } from "../lib/safe-redirect";
import { NextRequest } from "next/server";

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

console.log("\nUnauthenticated request to the session gate (HIGH-01)");
{
  const anonymous = new NextRequest("http://localhost:3011/pipeline");
  const session = await requireAdminSession(anonymous);
  check(session === null, "no cookie → null (refused), with no database round-trip");
}

console.log(failures === 0 ? "\nverify:security — all checks passed." : `\nverify:security — ${failures} failure(s).`);
process.exit(failures === 0 ? 0 : 1);
