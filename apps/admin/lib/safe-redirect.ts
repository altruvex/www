/**
 * Post-login destinations must stay on this origin.
 *
 * `/login?redirect=` is written by the proxy from `request.nextUrl.pathname`,
 * so a legitimate value is always a single-slash path. Anything else — an
 * absolute URL, a protocol-relative `//host`, a backslash trick — is a crafted
 * link, and following it would send a freshly authenticated operator off-site.
 *
 * Kept free of server imports so the login page (a client component) can use it.
 */
export function safeRedirectPath(value: string | null | undefined, fallback = "/"): string {
  if (!value) return fallback;
  if (!value.startsWith("/")) return fallback;
  if (value.startsWith("//") || value.startsWith("/\\")) return fallback;
  if (/[\r\n]/.test(value)) return fallback;
  return value;
}
