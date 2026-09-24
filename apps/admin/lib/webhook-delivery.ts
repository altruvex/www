import { prisma } from "@repo/database";

/**
 * Replay protection for signed webhooks.
 *
 * A signature proves a payload came from the sender; it does not prove this is
 * the first time it has arrived. Anyone who captured a valid delivery could
 * post it again a week later, and the writers would apply it — a captured
 * "build started" replayed after that build finished puts a finished build
 * back into RUNNING.
 *
 * `claimDelivery` writes the provider's own delivery id and relies on the
 * unique index to answer "have we seen this one". It returns false when the id
 * is already recorded, and the caller answers 200: the sender did nothing
 * wrong, and a retry after a network timeout must not look like a failure.
 */
export async function claimDelivery(provider: string, deliveryId: string | undefined | null): Promise<boolean> {
  // A delivery with no id cannot be deduplicated. Accepting it keeps a sender
  // that omits the header working, which is the same position as before.
  if (!deliveryId) return true;

  try {
    await prisma.webhookDelivery.create({ data: { provider, deliveryId } });
    return true;
  } catch {
    // Unique violation — seen already. Any other database error also lands
    // here, and the safe reading of "I could not record this" is "do not
    // apply it twice".
    return false;
  }
}
