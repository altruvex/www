import type { PricingCopy } from "./types";

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
    basic: "Contained",
    standard: "Standard",
    premium: "Extensive",
  },
  budget: {
    unsure: "Not sure yet",
  },
  maintenance: {
    essential: {
      name: "Essential",
      features: [
        "Security and dependency updates",
        "Uptime monitoring and backups",
      ],
      compare: {
        bestFor: "A site that mostly needs to stay safe and up to date",
        monitoring: "Uptime monitoring and backups",
      },
    },
    professional: {
      name: "Professional",
      features: [
        "Security and dependency updates",
        "Uptime monitoring and backups",
        "Support for small rollout or release updates",
      ],
      compare: {
        bestFor: "A site or store that changes every month",
        monitoring: "Uptime monitoring and backups",
      },
    },
    enterprise: {
      name: "Enterprise",
      features: [
        "Scope and coverage agreed in your quote",
        "Architecture, performance and security reviews",
        "Monitoring across several systems",
        "Optional tooling and integration management",
      ],
      compare: {
        bestFor: "Several systems, or one that cannot go down",
        monitoring: "Monitoring across several systems",
      },
    },
  },
  maintenanceTemplates: {
    requestCap:
      "Up to {count} edit requests per month (content or image swaps, minor section edits)",
    requestCapPriority:
      "Up to {count} edit requests per month, handled with priority",
    portal: "Client Portal access — track every request and its status",
    overage: "Additional requests are billed at {rate} EGP/hr.",
    overageShort: "{rate} EGP / hour",
    customPrice: "Custom",
    perCycle: {
      monthly: "/ month",
      annual: "/ year",
      one_time: "one-time",
    },
    perInterval: {
      monthly: "/ month",
      quarterly: "/ quarter",
      annual: "/ year",
    },
  },
  consulting: {
    "technical-audit": {
      title: "Technical audit:",
      titleItalic: "fixed scope, fixed price.",
      name: "Technical audit: fixed scope, fixed price.",
      description:
        "A defined first engagement before any rebuild or scale-up. We examine the current system, isolate technical risk, and convert findings into <strong>an execution-ready roadmap.</strong>",
      deliverables: [
        "Architecture: rebuild or repair",
        "Performance, including Core Web Vitals",
        "Security surface",
        "Search and data: SEO, structured data, analytics",
        "Releases: build pipeline, environments, backups",
        "Ownership: repository, accounts, licences, documentation",
        "A written roadmap and a 1-hour debrief call",
      ],
      durationLabel: "Duration",
      duration: "5 business days",
      priceLabel: "Fixed price",
      ctaLabel: "Start with the audit",
      eyebrow: "Fixed-scope entry offer",
      includedLabel: "What is included",
      creditLabel: "Credited to the build",
      creditIfBuild:
        "If you go on to build with Altruvex, the {credit} comes off the project price.",
      creditIfNot:
        "If you don't, you keep the findings and the roadmap — the fee stands.",
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
    revisionLabel: "Revisions",
    revisionNote:
      "{rounds} rounds of revisions are included. Further revision work is billed at {rate} EGP/hr.",
    addonLabel: "Pass-through items",
    addonNote:
      "Domain, hosting, and business email are billed at what we pay, plus a stated margin. Each appears as its own line — never folded into a project total.",
    costBasisLabel: "Our cost",
    markupLabel: "Margin",
    totalLabel: "You pay",
    pendingLabel: "Pricing pending",
    vatExcluded: "All figures exclude VAT at {rate}%.",
    paymentTriggers: [
      "{p} to start",
      "{p} at a development milestone",
      "{p} before production launch",
    ],
    milestoneTrigger: "a development milestone",
    ownership: "Code, designs and accounts pass to you at final payment.",
    validity: "{days} days from the date of issue.",
  },
  factors: {
    groups: {
      timeline: {
        label: "Delivery",
        options: {
          urgent: { label: "Urgent" },
          standard: { label: "Standard" },
          flexible: { label: "Flexible" },
        },
      },
      brand: {
        label: "Brand identity",
        options: {
          complete: { label: "Brand ready" },
          partial: { label: "Partial brand" },
          scratch: { label: "No brand yet" },
        },
      },
      content: {
        label: "Content readiness",
        options: {
          provide: { label: "You provide content" },
          "need-help": { label: "Content help" },
          unsure: { label: "Not sure yet" },
        },
      },
    },
    noChange: "no change",
  },
  scopeNotes: {
    cms: {
      name: "Content management (CMS)",
      description: "Edit pages and posts yourself.",
    },
    auth: {
      name: "Sign-in & accounts",
      description: "Customer or staff accounts, with roles.",
    },
    "payments-integrations": {
      name: "Payments & third-party integrations",
      description: "Payment gateway, CRM, APIs, analytics.",
    },
    bilingual: {
      name: "Arabic + English",
      description: "Both languages, right-to-left done properly.",
    },
    "performance-seo": {
      name: "Performance & SEO targets",
      description:
        "Speed, accessibility and search targets written into scope.",
    },
    maintenance: {
      name: "Ongoing maintenance",
      description: "A monthly plan after launch, billed separately.",
    },
  },
  investment: {
    design: {
      name: "Interface design",
      covers:
        "Interface and experience design, delivered as screens and a working design system.",
      how: "Per project, from the screens and flows involved",
      figure: "Scoped per project",
    },
    development: {
      name: "Custom development",
      covers: "Websites and systems engineered from your requirements.",
      how: "Published range by project type and complexity; fixed in the proposal",
    },
    audit: {
      name: "Technical audit",
      covers:
        "Architecture, performance and security review with a remediation roadmap.",
      how: "Fixed fee, credited to the build",
    },
    maintenance: {
      name: "Maintenance",
      covers: "Updates, monitoring, backups and edit requests after launch.",
      how: "Monthly plan",
    },
    weeksValue: "{weeks} weeks",
  },
};
