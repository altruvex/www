import type { Prisma } from "@repo/database";

export interface ProjectCurrencySource {
  readonly currency: string | null;
  readonly contract: { readonly proposal: { readonly currency: string } } | null;
}

export const PROJECT_CURRENCY_SELECT = {
  currency: true,
  contract: { select: { proposal: { select: { currency: true } } } },
} as const satisfies Prisma.ProjectSelect;

export const PROJECT_CURRENCY_INCLUDE = {
  contract: { select: { proposal: { select: { currency: true } } } },
} as const satisfies Prisma.ProjectInclude;

export function projectCurrency(project: ProjectCurrencySource): string {
  return project.contract?.proposal.currency ?? project.currency ?? "EGP";
}
