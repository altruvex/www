import type { Contract } from "@repo/database";

/**
 * How long a sign link stays live.
 *
 * A contract's sign token is minted when the document is generated and was,
 * until this, valid forever: a link withdrawn from a deal that went quiet, or
 * carrying a price agreed last spring, stayed signable. The window is renewed
 * every time the contract is sent, so the operator's own act of sending is what
 * keeps a link alive, and a link nobody sent again stops working on its own.
 */
export const SIGN_LINK_DAYS = 30;

export function signLinkExpiry(from: Date = new Date()): Date {
  return new Date(from.getTime() + SIGN_LINK_DAYS * 24 * 60 * 60 * 1000);
}

/**
 * Null means "no expiry recorded" and is treated as live: rows that predate
 * the column are backfilled by the migration, and refusing them here would
 * turn a missing value into a client who cannot sign.
 */
export function signLinkExpired(
  contract: Pick<Contract, "signTokenExpiresAt">,
  now: Date = new Date(),
): boolean {
  return contract.signTokenExpiresAt !== null && contract.signTokenExpiresAt.getTime() < now.getTime();
}

export const SIGN_LINK_EXPIRED_MESSAGE =
  "This signing link has expired. Ask us to send it again.";
