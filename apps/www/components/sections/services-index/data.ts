import { serviceWorld } from "@/lib/config/accent-world";

export const SERVICE_ORDER = [
  {
    id: "website",
    name: "interfaceDesign",
    href: "/services/interface-design",
    world: serviceWorld("interface-design"),
  },
  {
    id: "portal",
    name: "development",
    href: "/services/development",
    world: serviceWorld("development"),
  },
  {
    id: "audit",
    name: "consulting",
    href: "/services/consulting",
    world: serviceWorld("consulting"),
  },
  {
    id: "maintenance",
    name: "maintenance",
    href: "/services/maintenance",
    world: serviceWorld("maintenance"),
  },
] as const;

export type ServiceEntry = (typeof SERVICE_ORDER)[number];
type ServiceId = ServiceEntry["id"];

/* The three moments in a system's life, and the disciplines that belong to
   each. This is where a service sits, not how a build runs — the phase model
   is lib/process-phases.ts. */
export const LIFE_MOMENTS = [
  { id: "before", services: ["audit"] },
  { id: "build", services: ["website", "portal"] },
  { id: "live", services: ["maintenance"] },
] as const satisfies ReadonlyArray<{
  id: string;
  services: ReadonlyArray<ServiceId>;
}>;

export function serviceById(id: ServiceId): ServiceEntry {
  const entry = SERVICE_ORDER.find((service) => service.id === id);
  if (!entry) throw new Error(`Unknown service id: ${id}`);
  return entry;
}
