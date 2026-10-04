import type { Contract } from "@repo/database";

export const SIGN_LINK_DAYS = 30;

export function signLinkExpiry(from: Date = new Date()): Date {
  return new Date(from.getTime() + SIGN_LINK_DAYS * 24 * 60 * 60 * 1000);
}

export function signLinkExpired(
  contract: Pick<Contract, "signTokenExpiresAt">,
  now: Date = new Date(),
): boolean {
  return contract.signTokenExpiresAt !== null && contract.signTokenExpiresAt.getTime() < now.getTime();
}

export const SIGN_LINK_EXPIRED_MESSAGE =
  "This signing link has expired. Ask us to send it again.";
