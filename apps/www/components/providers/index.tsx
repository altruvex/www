"use client";

import { LoadingProvider } from "@/components/providers/loading-provider";
import { type ReactNode } from "react";

export function Providers({
  children,
  isBot = false,
}: {
  children: ReactNode;
  isBot?: boolean;
}) {
  return <LoadingProvider isBot={isBot}>{children}</LoadingProvider>;
}