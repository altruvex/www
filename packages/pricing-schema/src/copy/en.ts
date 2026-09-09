import type { PricingCopy } from "./types";

/**
 * EN copy for every priced entity.
 *
 * Names and descriptions live next to the numbers they describe so a tier
 * cannot be renamed in one surface and not another. Page chrome — headings,
 * eyebrows, FAQ prose — stays in the app's next-intl catalogue; only copy that
 * names or describes a priced thing belongs here.
 */
export const EN_COPY: PricingCopy = {
  services: {
    website: {
      documentName: "Corporate Website",
      name: "Website",
      description:
        "Custom marketing and corporate sites — design, build, and launch.",
    },
    webapp: {
      documentName: "Custom Web Application",
      name: "Web App",
      description:
        "Custom web applications: dashboards, portals, and internal systems.",
    },
    ecommerce: {
      documentName: "E-Commerce System",
      name: "E-commerce",
      description:
        "Storefronts with catalogue, checkout, and operational tooling.",
    },
    pwa: {
      documentName: "Progressive Web App",
      name: "PWA",
      description:
        "Installable, offline-capable applications built on the web platform.",
    },
  },
  bands: {
    basic: "Essential",
    standard: "Professional",
    premium: "Flagship",
  },
  tiers: {
    essential: {
      name: "Marketing System",
      buyerLabel: "Simple Marketing Site",
      internalLabel: "Focused launch scope",
      idealFor:
        "For a focused launch or compact marketing site that needs custom design, speed, lead capture, and room to grow.",
      notIncluded:
        "No advanced CMS workflows, dashboards, or payment flows - see Full Marketing Site or E-commerce Platform.",
      features: [
        "Custom launch page or compact site structure",
        "Responsive UI implementation across key devices",
        "Lead capture forms and analytics baseline",
        "SEO, performance, and deployment setup",
        "Domain, SSL, and base hosting setup",
      ],
      nextStep: "Next step: open Transparency and define the launch scope.",
      ctaLabel: "Get Launch Estimate",
    },
    professional: {
      name: "Business Platform",
      buyerLabel: "Full Marketing Site",
      internalLabel: "Marketing plus operations",
      idealFor:
        "For businesses that need repeatable content operations, multilingual UX, and practical integrations with their tools.",
      notIncluded:
        "No full product catalog, deep commerce operations, or custom internal product logic - see E-commerce Platform or Business Web System.",
      features: [
        "Everything in Simple Marketing Site",
        "CMS setup for repeatable content workflows",
        "Bilingual structure with QA across key journeys",
        "One key integration such as CRM, booking, or auth",
        "Technical discovery, architecture, and analytics plan",
      ],
      nextStep:
        "Next step: open Transparency and map the workflows and integrations.",
      ctaLabel: "Get Growth Estimate",
    },
    ecommerce: {
      name: "Commerce Engine",
      buyerLabel: "E-commerce Platform",
      internalLabel: "Storefront plus operations",
      idealFor:
        "For stores that need catalog, checkout, payments, shipping, order operations, and reliable performance.",
      notIncluded:
        "No internal ERP replacement or complex product logic - scope those in Business Web System or a custom quote.",
      features: [
        "Commerce architecture and product catalog model",
        "Checkout flow with payment gateway planning",
        "Inventory, shipping, and order management foundations",
        "Revenue-focused performance and analytics setup",
        "Operational handoff for managing products and orders",
      ],
      nextStep: "Next step: open Transparency and scope the commerce path.",
      ctaLabel: "Get Commerce Estimate",
    },
    flagship: {
      name: "Custom Infrastructure",
      buyerLabel: "Business Web System",
      internalLabel: "Operations and workflows",
      idealFor:
        "For portals, dashboards, and operational systems that need custom workflows beyond a marketing site.",
      notIncluded: "",
      features: [
        "Custom product discovery and architecture",
        "Dashboards, portals, or workflow engines",
        "Role-based access and business logic",
        "Multiple integrations and data flows",
        "Phased delivery roadmap with infrastructure planning",
      ],
      nextStep:
        "Next step: open Transparency and map dashboards, portals, or internal logic.",
      ctaLabel: "Book Architecture Call",
    },
  },
  tierTemplates: {
    timelineLabel: "Delivery",
    timelineValue: "{weeks} weeks",
    ceiling:
      "No engagement runs past {max} weeks. Anything larger ships in phases.",
  },
  maintenance: {
    essential: {
      name: "Essential",
      features: [
        "Monthly security and dependency update cycle",
        "Uptime monitoring and backup verification",
        "Business-hours WhatsApp or email support",
        "Quarterly health summary",
      ],
    },
    professional: {
      name: "Professional",
      features: [
        "Weekly checks and priority incident handling",
        "Daily monitoring with backup and uptime review",
        "Monthly performance and security report",
        "Support for small rollout or release updates",
      ],
    },
    enterprise: {
      name: "Enterprise",
      features: [
        "Custom SLA and dedicated response protocol",
        "Architecture, performance, and security review cadence",
        "Multi-system monitoring and incident management",
        "Optional tooling and integration management",
      ],
    },
  },
  maintenanceTemplates: {
    requestCap:
      "Up to {count} edit requests per month (content or image swaps, minor section edits)",
    requestCapPriority:
      "Up to {count} edit requests per month, with priority turnaround",
    portal: "Client Portal access — track every request and its status",
    overage: "Additional requests are billed at {rate} EGP/hr.",
    customPrice: "Custom",
    perCycle: {
      monthly: "/ month",
      annual: "/ year",
      one_time: "one-time",
    },
  },
  consulting: {
    "technical-audit": {
      title: "Technical Audit -",
      titleItalic: "Fixed Scope, Fixed Price.",
      name: "Technical Audit - Fixed Scope, Fixed Price.",
      description:
        "A defined first engagement before any rebuild or scale-up. We examine the current system, isolate technical risk, and convert findings into <strong>an execution-ready roadmap.</strong>",
      deliverables: [
        "Current stack and architecture review",
        "Performance bottleneck identification",
        "Security surface assessment",
        "Actionable remediation roadmap",
        "1-hour debrief call",
      ],
      durationLabel: "Duration",
      duration: "5 business days",
      priceLabel: "Fixed price",
      ctaLabel: "Start with the audit",
      eyebrow: "Fixed-scope entry offer",
      includedLabel: "What is included",
    },
  },
  addons: {
    domain: {
      name: "Domain registration",
      description: "Annual registration, billed at cost plus a stated margin.",
    },
    hosting: {
      name: "Hosting",
      description: "Annual hosting, billed at cost plus a stated margin.",
    },
    "business-mail": {
      name: "Business email",
      description:
        "Annual mailbox licensing, billed at cost plus a stated margin.",
    },
    "managed-bundle": {
      name: "Managed renewals",
      description:
        "Renewal tracking and one consolidated invoice for domain, hosting, and business email.",
    },
  },
  terms: {
    vatLabel: "VAT",
    vatNote:
      "All project figures are quoted excluding VAT. VAT at {rate}% is added at contract stage.",
    revisionLabel: "Revision rate",
    revisionNote:
      "{rounds} rounds of revisions are included. Further revision work is billed at {rate} EGP/hr.",
    usdLabel: "USD rate",
    usdNote:
      "USD figures convert at a fixed {rate} EGP/USD, reviewed quarterly. Last reviewed {reviewedOn}.",
    addonLabel: "Pass-through items",
    addonNote:
      "Domain, hosting, and business email are billed at what we pay, plus a stated margin. Each appears as its own line — never folded into a project total.",
    costBasisLabel: "Our cost",
    markupLabel: "Margin",
    totalLabel: "You pay",
    pendingLabel: "Pricing pending",
  },
};
