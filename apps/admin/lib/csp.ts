/**
 * Content-Security-Policy for the admin app, built per request around a nonce.
 *
 * `'unsafe-inline'` made the policy decorative for script injection: any
 * injected `<script>` would have run. A nonce is only workable because every
 * page here is dynamic already (the dashboard is `force-dynamic`, the session
 * is read on each request), so there is no static output to bake a stale nonce
 * into — which is why the public site keeps the older policy.
 *
 * React's development build needs `eval` for its stack reconstruction, and
 * Turbopack's HMR runs over a websocket; both are development-only.
 */
export function contentSecurityPolicy(nonce: string, isDev: boolean): string {
  const scriptSrc = [`'self'`, `'nonce-${nonce}'`, ...(isDev ? [`'unsafe-eval'`] : [])];
  const connectSrc = [`'self'`, ...(isDev ? ["ws:", "wss:"] : [])];

  return [
    "default-src 'self'",
    `script-src ${scriptSrc.join(" ")}`,
    // Styles stay inline-permitted: Tailwind's runtime and the font loader
    // emit style attributes, and a style injection is not script execution.
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob:",
    "font-src 'self'",
    `connect-src ${connectSrc.join(" ")}`,
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "object-src 'none'",
    ...(isDev ? [] : ["upgrade-insecure-requests"]),
  ].join("; ");
}

/** Where the per-request nonce is handed from the proxy to the page. */
export const NONCE_HEADER = "x-nonce";
