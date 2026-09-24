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

export const LOOP_STAGES = [
  { id: "discover", services: ["audit"] },
  { id: "architect", services: [] },
  { id: "build", services: ["website", "portal"] },
  { id: "launch", services: [] },
  { id: "evolve", services: ["maintenance"] },
] as const satisfies ReadonlyArray<{
  id: string;
  services: ReadonlyArray<ServiceId>;
}>;

export function serviceById(id: ServiceId): ServiceEntry {
  const entry = SERVICE_ORDER.find((service) => service.id === id);
  if (!entry) throw new Error(`Unknown service id: ${id}`);
  return entry;
}
