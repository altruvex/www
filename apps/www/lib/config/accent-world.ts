export type AccentPalette =
  | "orange"
  | "green"
  | "blue"
  | "violet"
  | "cyan";

export function accentWorldClass(palette: AccentPalette): string {
  return `accent-world-${palette}`;
}

export type ServiceSlug =
  | "interface-design"
  | "development"
  | "consulting"
  | "maintenance";

const SERVICE_WORLD = {
  "interface-design": "violet",
  development: "blue",
  consulting: "cyan",
  maintenance: "green",
} as const satisfies Record<ServiceSlug, AccentPalette>;

export function serviceWorld(slug: ServiceSlug): AccentPalette {
  return SERVICE_WORLD[slug];
}
