import {
  clientIpFromHeaders,
  enforceRateLimit as enforce,
  type RateLimitResult,
} from "@repo/database";
import { NextRequest } from "next/server";

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
