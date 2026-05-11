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

## Our Commitment

Altruvex is built on the principle of full ownership and technical accountability — for our clients and for our own systems. We take security disclosures seriously and will respond with the same standard we apply to all production work.
