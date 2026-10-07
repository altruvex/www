"use client";

import { Analytics } from "@vercel/analytics/react";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { useEffect } from "react";
import { captureAttribution } from "@/lib/attribution";

export function VercelAnalytics() {
  // The one client mount every page shares: record the first touch here.
  useEffect(() => {
    captureAttribution();
  }, []);

  return (
    <>
      <SpeedInsights />
      <Analytics />
    </>
  );
}
