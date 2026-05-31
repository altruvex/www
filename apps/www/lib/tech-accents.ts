/** HSL channel values for tech-dna nodes — paired with --tech-accent-* in globals.css */
export type TechAccentId =
  | "nextjs"
  | "react"
  | "typescript"
  | "nodejs"
  | "postgresql"
  | "prisma"
  | "tailwind"
  | "vercel"
  | "vps";

export function techAccentHsl(id: TechAccentId): string {
  return `hsl(var(--tech-accent-${id}))`;
}

export function techAccentHsla(id: TechAccentId, alpha: number): string {
  return `hsl(var(--tech-accent-${id}) / ${alpha})`;
}
