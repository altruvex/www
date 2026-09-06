import {
  clientIpFromHeaders,
  enforceRateLimit as enforce,
  type RateLimitResult,
} from "@repo/database";
import { NextRequest } from "next/server";

/**
 * Thin wrapper over the shared limiter in `@repo/database`.
 *
 * The implementation moved there so the admin app's public portal endpoints
 * could use the same one rather than carrying a second copy. This signature is
 * unchanged, so existing call sites are untouched.
 */
type RateLimitConfig = {
  scope: string;
  route: string;
  limit: number;
  windowSeconds: number;
};

export async function enforceRateLimit(
  req: NextRequest,
  config: RateLimitConfig,
): Promise<RateLimitResult> {
  return enforce({ ...config, identifier: clientIpFromHeaders(req.headers) });
}
