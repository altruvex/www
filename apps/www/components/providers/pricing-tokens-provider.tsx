"use client";

import { fillTemplate } from "@repo/pricing-schema";
import * as React from "react";

const PricingTokensContext = React.createContext<Readonly<Record<string, string>>>({});

export function PricingTokensProvider({
  tokens,
  children,
}: {
  tokens: Readonly<Record<string, string>>;
  children: React.ReactNode;
}) {
  return (
    <PricingTokensContext.Provider value={tokens}>
      {children}
    </PricingTokensContext.Provider>
  );
}

export function usePricingTokens(): Readonly<Record<string, string>> {
  return React.useContext(PricingTokensContext);
}

export function useFillPricingTokens(): (text: string) => string {
  const tokens = React.useContext(PricingTokensContext);
  return React.useCallback((text: string) => fillTemplate(text, tokens), [tokens]);
}
