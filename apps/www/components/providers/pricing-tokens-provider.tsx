"use client";

import { fillTemplate } from "@repo/pricing-schema";
import * as React from "react";

/**
 * Resolved pricing tokens for prose.
 *
 * Some client-facing copy is a sentence that happens to quote a price — an FAQ
 * answer, the homepage quote artifact. Those live in the next-intl catalogue
 * because they are prose, and they carry a `{token}` where the figure goes.
 *
 * Resolution has to happen on the server (the overrides live in the database),
 * but the components that render this prose are client components, and one of
 * them is behind a dynamic import. Passing a resolved token map down through
 * context is what lets those components stay client-side without every page in
 * between having to know about pricing.
 */
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

/**
 * Fills `{token}` placeholders in a prose string.
 *
 * Falls back to leaving the text untouched if no provider is present, so a
 * component rendered outside the tree degrades to showing the raw copy rather
 * than crashing.
 */
export function useFillPricingTokens(): (text: string) => string {
  const tokens = React.useContext(PricingTokensContext);
  return React.useCallback((text: string) => fillTemplate(text, tokens), [tokens]);
}
