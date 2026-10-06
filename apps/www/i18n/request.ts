import { getRequestConfig } from "next-intl/server";
import { hasLocale } from "next-intl";
import { routing } from "./routing";

const NAMESPACES = [
  "a11y",
  "about",
  "approach",
  "auditLead",
  "caseStudies",
  "commandPalette",
  "commercial",
  "common",
  "contact",
  "contactPage",
  "exitIntent",
  "faq",
  "footer",
  "hero",
  "how-we-work",
  "nav",
  "notFound",
  "offline",
  "ownershipStack",
  "pricing",
  "pricingModel",
  "privacy",
  "problem",
  "process",
  "schedule",
  "serviceDetails",
  "services",
  "servicesPage",
  "standards",
  "terms",
  "transparency",
  "validations",
  "work",
  "writing",
] as const;

export default getRequestConfig(async ({ requestLocale }) => {
  const requested = await requestLocale;
  const locale = hasLocale(routing.locales, requested)
    ? requested
    : routing.defaultLocale;

  const modules = await Promise.all(
    NAMESPACES.map((namespace) =>
      import(`../messages/${locale}/${namespace}.json`),
    ),
  );

  const messages = Object.fromEntries(
    NAMESPACES.map((namespace, i) => [namespace, modules[i].default]),
  );

  return {
    locale,
    messages,
  };
});
