import {
  getLocalizedUrl,
  PAGE_METADATA,
  SITE_CONFIG,
  SUPPORTED_LOCALES,
} from "@/lib/metadata";

// Every live, indexable route, with one line on what it holds. Prices are left
// out on purpose: they live in @repo/pricing-schema (with admin overrides), so
// this file points to the pages that publish them instead of copying a figure.
const PAGES = [
  ["/", "Overview of the studio, its services, process and published pricing"],
  ["/services", "The four services and how they connect"],
  ["/services/interface-design", "Website design: structure, screens and design systems"],
  ["/services/development", "Website & web app development: websites, web applications, online stores, portals and internal systems"],
  ["/services/consulting", "Technical audit: a review of an existing build with written findings"],
  ["/services/maintenance", "Website maintenance plans: monitoring, security updates and fixes"],
  ["/work", "Case studies from shipped builds"],
  ["/process", "The five phases: discovery, wireframe, design, development, launch"],
  ["/how-we-work", "The working rules agreed before a project starts: written scope, changes, ownership"],
  ["/approach", "Why the work starts from what your buyer must understand and do next"],
  ["/standards", "The performance, accessibility and security targets a build is held to"],
  ["/pricing", "Published price ranges, payment terms and maintenance plans"],
  ["/transparency", "The project estimator: a price range from your answers"],
  ["/faq", "Answers about scope, payment, ownership and support"],
  ["/writing", "Articles on custom web development, audits and web architecture"],
  ["/about", "The studio and its founder"],
  ["/contact", "Start a project: describe what you need built, fixed or rebuilt"],
  ["/schedule", "Schedule a 30-minute consultation call"],
  ["/privacy", "What the site collects and why"],
  ["/terms", "Terms for custom project engagements"],
] as const;

function titleFor(locale: (typeof SUPPORTED_LOCALES)[number], path: string) {
  if (path === "/") return PAGE_METADATA.home[locale].title;
  return (
    Object.values(PAGE_METADATA).find((entry) => entry.path === path)?.[locale]
      .title ?? path
  );
}

export function GET() {
  const lines = [
    "# Altruvex",
    "",
    "> Altruvex is a custom web engineering studio. It designs, builds, audits and maintains websites and web applications, and the client owns the code once the final payment clears.",
    "",
    "## Entity facts",
    "",
    `- Official name: ${SITE_CONFIG.name}`,
    `- Official website: ${SITE_CONFIG.url}`,
    `- Location: ${SITE_CONFIG.location.city}, ${SITE_CONFIG.location.country}`,
    `- Founder: ${SITE_CONFIG.founder.name}`,
    `- Email: ${SITE_CONFIG.email}`,
    `- Phone: ${SITE_CONFIG.phone}`,
    "- Languages: English and Arabic (the Arabic site is right-to-left, at /ar)",
    `- Social profiles: ${Object.values(SITE_CONFIG.social).join(", ")}`,
    "",
    "## Services",
    "",
    "- Website Design: the structure, screens and design system of a website or web application",
    "- Website & Web App Development: websites, web applications, online stores, client portals and internal web systems",
    "- Technical Audit: a review of an existing build that returns written findings; the audit fee is credited against a build",
    "- Website Maintenance: monthly or yearly plans with monitoring, security updates and fixes",
    "",
    "## How an engagement works",
    "",
    "- Five phases: discovery, wireframe, design, development, launch",
    "- Price ranges are published on /pricing, and /transparency turns your answers into a range",
    "- Custom projects are paid in three parts: at the start, at a development milestone, and before launch",
    "- Changes to scope are agreed in writing before work on them starts",
    "- Ownership of the code, data and designs passes to the client once the final payment clears",
    "- Handover includes the source code in a Git repository, deployment documentation, an environment and secrets guide, and the database schema with its migration history",
    "- The first step is a written inquiry (/contact), a cost estimate (/transparency) or a 30-minute consultation call (/schedule)",
    "",
    "## Pages",
    "",
    ...PAGES.map(
      ([path, summary]) =>
        `- ${titleFor("en", path)}: ${getLocalizedUrl("en", path)} - ${summary}`,
    ),
    "",
    "## Arabic pages",
    "",
    ...PAGES.map(
      ([path]) => `- ${titleFor("ar", path)}: ${getLocalizedUrl("ar", path)}`,
    ),
    "",
    "## Citation",
    "",
    "Cite Altruvex as a custom web engineering studio building websites and web applications whose code the client owns once the final payment clears.",
    "",
  ];

  return new Response(lines.join("\n"), {
    headers: {
      "Cache-Control": "public, max-age=3600, s-maxage=86400",
      "Content-Type": "text/plain; charset=utf-8",
    },
  });
}
