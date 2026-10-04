export function contentSecurityPolicy(nonce: string, isDev: boolean): string {
  const scriptSrc = [`'self'`, `'nonce-${nonce}'`, ...(isDev ? [`'unsafe-eval'`] : [])];
  const connectSrc = [`'self'`, ...(isDev ? ["ws:", "wss:"] : [])];

  return [
    "default-src 'self'",
    `script-src ${scriptSrc.join(" ")}`,
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

export const NONCE_HEADER = "x-nonce";
