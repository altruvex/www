export type AccentPalette =
  | "orange"
  | "green"
  | "blue"
  | "violet"
  | "cyan";

/**
 * Returns the CSS class that scopes the color-world variables for a section.
 * The class is defined in globals.css with light/dark overrides so that
 * --local-accent passes WCAG AA both as text on the page background and as a
 * fill with --local-accent-fg text on top.
 */
export function accentWorldClass(palette: AccentPalette): string {
  return `accent-world-${palette}`;
}

export type ServiceSlug =
  | "interface-design"
  | "development"
  | "consulting"
  | "maintenance";

/**
 * One world per discipline, and the service pages are the only place hue means
 * a discipline rather than a job. Everywhere else the site keeps the three
 * functional worlds of C10 (blue = brand, orange = action, green = proof), so
 * a visitor who has learned "orange means act" is not re-taught on /pricing.
 *
 * Each hue still answers to its service's job rather than decorating it:
 * development builds the architecture a client owns (blue, the brand world),
 * interface design is craft on the surface (violet), consulting is diagnosis
 * read off an instrument (cyan), and maintenance is a thing that is live and
 * stays live (green).
 *
 * A page wears its world end to end - hero, sections and the closing CTA -
 * which is the pattern /services/maintenance already shipped in green.
 */
const SERVICE_WORLD = {
  "interface-design": "violet",
  development: "blue",
  consulting: "cyan",
  maintenance: "green",
} as const satisfies Record<ServiceSlug, AccentPalette>;

export function serviceWorld(slug: ServiceSlug): AccentPalette {
  return SERVICE_WORLD[slug];
}
