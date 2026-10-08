"use client";

import { Link, usePathname } from "@/i18n/navigation";
import { trackEvent } from "@/lib/analytics";
import type { ComponentProps, MouseEvent } from "react";

type TrackedCtaLinkProps = ComponentProps<typeof Link> & {
  ctaKey: string;
  /** The typed CTA context as a query string; ids only, never visitor input. */
  ctaContext?: string;
};

/**
 * A locale-aware Link that reports `contextual_cta_clicked` on click. The
 * event is fire-and-forget, so navigation is never held back by it.
 */
export function TrackedCtaLink({
  ctaKey,
  ctaContext,
  onClick,
  ...props
}: TrackedCtaLinkProps) {
  const page = usePathname();

  const handleClick = (event: MouseEvent<HTMLAnchorElement>) => {
    onClick?.(event);
    trackEvent("contextual_cta_clicked", {
      key: ctaKey,
      page,
      ...(ctaContext && { context: ctaContext }),
    });
  };

  return <Link {...props} onClick={handleClick} />;
}
