import type { NextConfig } from "next";

// Internal tool: never indexed, never deployed with the public site.
const nextConfig: NextConfig = {
  poweredByHeader: false,
  transpilePackages: ["@repo/ui"],
};

export default nextConfig;
