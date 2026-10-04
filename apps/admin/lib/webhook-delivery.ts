import { prisma } from "@repo/database";

export async function claimDelivery(provider: string, deliveryId: string | undefined | null): Promise<boolean> {
  if (!deliveryId) return true;

  try {
    await prisma.webhookDelivery.create({ data: { provider, deliveryId } });
    return true;
  } catch {
    return false;
  }
}
