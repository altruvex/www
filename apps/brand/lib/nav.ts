export interface NavItem {
  href: string;
  label: string;
  index: string;
}

export const NAV: NavItem[] = [
  { href: "/", label: "Overview", index: "00" },
  { href: "/logo", label: "Logo", index: "01" },
  { href: "/color", label: "Colour", index: "02" },
  { href: "/type", label: "Typography", index: "03" },
  { href: "/hierarchy", label: "Hierarchy", index: "04" },
  { href: "/edges", label: "Borders & radius", index: "05" },
  { href: "/elevation", label: "Elevation & glass", index: "06" },
  { href: "/motion", label: "Motion", index: "07" },
  { href: "/audit", label: "Drift audit", index: "08" },
  { href: "/board", label: "Component board", index: "09" },
];
