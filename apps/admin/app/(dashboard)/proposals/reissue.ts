import { daysFromNow } from "@/lib/format";

export function needsNewVersion(
  status: string,
  validUntil: Date | string,
): boolean {
  if (status === "ACCEPTED") return false;
  if (status === "REJECTED" || status === "EXPIRED") return true;
  const days = daysFromNow(validUntil);
  return days != null && days < 0;
}

export const VALIDITY_EXTENSIONS = [7, 14, 30] as const;

export function canExtendValidity(
  status: string,
  validUntil: Date | string,
  hasContract: boolean,
): boolean {
  if (hasContract) return false;
  if (!["SENT", "DELIVERED", "READ", "VIEWED"].includes(status)) return false;
  const days = daysFromNow(validUntil);
  return days != null && days <= 7;
}

export function newVersionHref(clientId: string, proposalId: string): string {
  return `/clients/${clientId}/new-proposal?from=${encodeURIComponent(proposalId)}`;
}
