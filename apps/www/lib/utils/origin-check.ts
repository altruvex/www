import { NextRequest } from "next/server";

export function isTrustedOrigin(request: NextRequest): boolean {
  const origin = request.headers.get("origin");
  const source = origin ?? request.headers.get("referer");
  if (!source) return false;

  try {
    return new URL(source).host === request.nextUrl.host;
  } catch {
    return false;
  }
}
