# Security Policy

## Supported Versions

| Version              | Supported |
| -------------------- | --------- |
| Latest (main branch) | ✅        |
| Older releases       | ❌        |

We maintain active security support on the latest production deployment only.

---

## Reporting a Vulnerability

**Do not open a public GitHub issue for security vulnerabilities.**

If you discover a security issue, please report it privately:

- **Email:** security@altruvex.com
- **Subject:** `[SECURITY] Brief description of the issue`

Include the following in your report:

1. Description of the vulnerability
2. Steps to reproduce
3. Potential impact
4. Your suggested fix (optional)

You will receive an acknowledgment within **48 hours** and a resolution update within **7 days**.

We treat all reports seriously. If the issue is confirmed, we will:

- Patch and deploy a fix
- Credit you in the changelog (unless you prefer anonymity)

---

## Scope

### In Scope

- Authentication and session handling
- Data exposure or information leakage
- Injection vulnerabilities (SQL, XSS, CSRF)
- Authorization and access control issues
- Third-party dependency vulnerabilities with direct impact

### Out of Scope

- Issues requiring physical access to a device
- Social engineering attacks
- Vulnerabilities in services we do not control
- Denial of service (DoS) attacks
- Missing security headers without demonstrated impact

---

## Hardening decisions

These are the choices this codebase has made, and the reason each one is the
way it is. The audit they came from is `SECURITY_AUDIT.md`; the steps that live
outside the repository are `SECURITY_TODO.md`.

**Authorization is decided twice, never once.** `proxy.ts` refuses a
non-admin before a page renders, and `app/(dashboard)/layout.tsx` decides again
from the session itself. A middleware bypass in the framework — a class of bug
that has recurred in Next.js — must not be the only thing between a request and
every client, contract and payment record.

**Two-factor is offered, and optional unless configured otherwise.** TOTP with
backup codes, enrolled at `/security`. An operator who has not enrolled is sent
there on sign-in and may choose *Skip for now*, which is remembered in that
browser for 30 days before the offer returns (Ali, 2026-09-19). Set
`ADMIN_MFA_REQUIRED=true` to make enrolment a gate with no skip. Until an
operator enrols, their password alone guards every client, contract and
payment record.

**Sign-in attempts are counted in the database, not in memory.** Better Auth's
default limiter counts per process, and every serverless instance is a process.

**Client-facing links are built on `BETTER_AUTH_URL`,** which is required in
production. A link derived from the request's `Host` header is a link the
caller chose, and these links are texted and emailed to clients.

**A signing link expires after 30 days and is renewed by sending.** Sending is
the act that hands a client a link, whoever performs it, so the window restarts
on both the system send and a hand-recorded one.

**Documents are signed on read when `R2_PRIVATE=true`.** A proposal or contract
URL that never expires is a permanent, unrevocable copy of a client's
agreement. Links inside mail live longer than links on a screen, because a
client opens a proposal days later.

**The service worker caches hashed build output only.** It previously cached
every response, which left client records readable in the browser after
sign-out.

**Signed webhooks are also checked for replay.** A signature proves the sender;
the delivery id proves it is the first time. Terminal build and deployment
states never regress, so a late or replayed event cannot put a finished build
back into RUNNING.

**Scripts run under a per-request nonce.** The admin app's CSP carries no
`'unsafe-inline'`. The public site still does: nonces force dynamic rendering,
and that site is static by design — a documented, accepted difference.

**Estimates are recomputed server-side.** The figure stored on a lead is one
this codebase produced, not one the visitor's browser sent, because an operator
quotes it back to the client later.

**Sign-ins are in the audit trail.** The login screen says every session is
logged, and `/audit` now answers it.

### Verifying

```bash
cd apps/admin && bun run verify:security   # the regression suite for the above
bun audit                                  # dependency advisories
```

---

## Our Commitment

Altruvex is built on the principle of full ownership and technical accountability - for our clients and for our own systems. We take security disclosures seriously and will respond with the same standard we apply to all production work.
