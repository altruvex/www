import { prisma } from "@repo/database";
import {
  COMPLEXITY_IDS,
  PRICE_BOUNDS,
  MAINTENANCE_PLAN_IDS,
  ADDON_IDS,
  CONSULTING_PACKAGE_IDS,
  SERVICE_IDS,
} from "@repo/pricing-schema";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import {
  diffFields,
  getPricing,
  pricingHistory,
  recordChanges,
} from "@/lib/pricing-store";
import { requireAdminSession } from "@/lib/require-admin";
import { revalidatePublicPricing } from "@/lib/revalidate-pricing";

/**
 * The only write path for pricing.
 *
 * Public surfaces are read-only consumers; this route is where a number
 * changes. Every accepted change is diffed field-by-field and written to the
 * change log in the same transaction, so the log cannot drift from the value.
 */

const unauthorized = () =>
  NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });

const money = z.number().int().min(PRICE_BOUNDS.moneyMin).max(PRICE_BOUNDS.moneyMax);
const status = z.enum(["active", "planned", "retired"]);

const cellSchema = z.object({
  kind: z.literal("cell"),
  serviceId: z.enum(SERVICE_IDS),
  complexityId: z.enum(COMPLEXITY_IDS),
  priceMin: money,
  priceMax: money,
  weeksMin: z.number().int().min(PRICE_BOUNDS.weeksMin).max(PRICE_BOUNDS.weeksMax),
  weeksMax: z.number().int().min(PRICE_BOUNDS.weeksMin).max(PRICE_BOUNDS.weeksMax),
});

const maintenanceSchema = z.object({
  kind: z.literal("maintenance"),
  id: z.enum(MAINTENANCE_PLAN_IDS),
  price: money.nullable(),
  requestsPerCycle: z.number().int().min(0).max(PRICE_BOUNDS.requestsPerCycleMax).nullable(),
  overageHourlyRate: money.nullable(),
  internalHourEquivalent: z.number().int().min(0).max(PRICE_BOUNDS.requestsPerCycleMax).nullable(),
  status,
});

const consultingSchema = z.object({
  kind: z.literal("consulting"),
  id: z.enum(CONSULTING_PACKAGE_IDS),
  price: money,
  durationBusinessDays: z.number().int().min(1).max(PRICE_BOUNDS.durationDaysMax),
  status,
});

const addonSchema = z.object({
  kind: z.literal("addon"),
  id: z.enum(ADDON_IDS),
  costBasis: money.nullable(),
  markupType: z.enum(["percent", "fixed"]),
  markupValue: z.number().int().min(0).max(PRICE_BOUNDS.markupMax),
  billingCycle: z.enum(["monthly", "annual", "one_time"]),
  status,
});

const termsSchema = z.object({
  kind: z.literal("terms"),
  vatRate: z.number().min(0).max(1),
  revisionHourlyRate: money,
  revisionHourlyRateUsd: money,
  includedRevisionRounds: z.number().int().min(0).max(PRICE_BOUNDS.revisionRoundsMax),
  paymentSplitFirst: z.number().int().min(0).max(100),
  paymentSplitSecond: z.number().int().min(0).max(100),
  paymentSplitFinal: z.number().int().min(0).max(100),
  proposalValidityDays: z.number().int().min(1).max(PRICE_BOUNDS.durationDaysMax),
  postLaunchWarrantyDays: z.number().int().min(0).max(PRICE_BOUNDS.durationDaysMax),
  usdEgpRate: z.number().int().min(PRICE_BOUNDS.exchangeRateMin).max(PRICE_BOUNDS.exchangeRateMax),
  usdRateReviewedOn: z.string(),
});

const payloadSchema = z.discriminatedUnion("kind", [
  cellSchema,
  maintenanceSchema,
  consultingSchema,
  addonSchema,
  termsSchema,
]);

export async function GET(request: NextRequest) {
  if (!(await requireAdminSession(request))) return unauthorized();

  const [pricing, history] = await Promise.all([getPricing(), pricingHistory()]);
  return NextResponse.json({ success: true, pricing, history });
}

export async function PATCH(request: NextRequest) {
  const session = await requireAdminSession(request);
  if (!session) return unauthorized();

  const parsed = payloadSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json(
      { success: false, message: "Invalid pricing payload", issues: parsed.error.issues },
      { status: 400 },
    );
  }
  const body = parsed.data;
  const actor = session.user.email ?? session.user.id ?? null;

  // A range that runs backwards would render as "70,000 – 35,000 EGP" on a
  // published page, so it is rejected here rather than shipped.
  if (body.kind === "cell" && (body.priceMax < body.priceMin || body.weeksMax < body.weeksMin)) {
    return NextResponse.json(
      { success: false, message: "Range maximum cannot be below its minimum." },
      { status: 400 },
    );
  }
  if (
    body.kind === "terms" &&
    body.paymentSplitFirst + body.paymentSplitSecond + body.paymentSplitFinal !== 100
  ) {
    return NextResponse.json(
      { success: false, message: "Milestone split must total 100%." },
      { status: 400 },
    );
  }

  try {
    const changes = await applyChange(body, actor);

    // The write is already committed. This only shortens how long the public
    // site keeps serving the previous number, so its outcome is reported but
    // never turned into a failure.
    const revalidated = await revalidatePublicPricing();
    if (!revalidated.ok) {
      console.warn(
        `Pricing saved, but the public site was not revalidated: ${revalidated.reason}. It will pick the change up when its cache expires.`,
      );
    }

    return NextResponse.json({
      success: true,
      changes,
      publicSiteRevalidated: revalidated.ok,
    });
  } catch (error) {
    console.error("Pricing update failed", error);
    return NextResponse.json(
      { success: false, message: "The pricing change could not be saved." },
      { status: 500 },
    );
  }
}

type Payload = z.infer<typeof payloadSchema>;

async function applyChange(body: Payload, actor: string | null): Promise<number> {
  if (body.kind === "cell") {
    const { serviceId, complexityId } = body;
    // Columns are named rather than spread: on the one path that changes a
    // published price, what gets written should be explicit.
    const fields = {
      priceMin: body.priceMin,
      priceMax: body.priceMax,
      weeksMin: body.weeksMin,
      weeksMax: body.weeksMax,
    };
    const key = { serviceId_complexityId: { serviceId, complexityId } };
    return prisma.$transaction(async (tx) => {
      const before = await tx.pricingCellOverride.findUnique({ where: key });
      await tx.pricingCellOverride.upsert({
        where: key,
        create: { serviceId, complexityId, ...fields, updatedBy: actor },
        update: { ...fields, updatedBy: actor, version: { increment: 1 } },
      });
      const entries = diffFields(
        "cell",
        `${serviceId}/${complexityId}`,
        before ?? {},
        fields,
      );
      await recordChanges(entries, actor);
      return entries.length;
    });
  }

  if (body.kind === "terms") {
    const data = {
      vatRate: body.vatRate,
      revisionHourlyRate: body.revisionHourlyRate,
      revisionHourlyRateUsd: body.revisionHourlyRateUsd,
      includedRevisionRounds: body.includedRevisionRounds,
      paymentSplitFirst: body.paymentSplitFirst,
      paymentSplitSecond: body.paymentSplitSecond,
      paymentSplitFinal: body.paymentSplitFinal,
      proposalValidityDays: body.proposalValidityDays,
      postLaunchWarrantyDays: body.postLaunchWarrantyDays,
      usdEgpRate: body.usdEgpRate,
      usdRateReviewedOn: new Date(body.usdRateReviewedOn),
    };
    return prisma.$transaction(async (tx) => {
      const before = await tx.commercialTermsOverride.findUnique({
        where: { id: "default" },
      });
      await tx.commercialTermsOverride.upsert({
        where: { id: "default" },
        create: { id: "default", ...data, updatedBy: actor },
        update: { ...data, updatedBy: actor, version: { increment: 1 } },
      });
      const entries = diffFields("terms", "default", before ?? {}, data);
      await recordChanges(entries, actor);
      return entries.length;
    });
  }

  // Three explicit branches rather than one generic one. Erasing the Prisma
  // delegates through a structural type would defeat the typed models on the
  // one path in the system that changes a published price.
  if (body.kind === "maintenance") {
    const { id } = body;
    const fields = {
      price: body.price,
      requestsPerCycle: body.requestsPerCycle,
      overageHourlyRate: body.overageHourlyRate,
      internalHourEquivalent: body.internalHourEquivalent,
      status: body.status,
    };
    return prisma.$transaction(async (tx) => {
      const before = await tx.maintenancePlanOverride.findUnique({ where: { id } });
      await tx.maintenancePlanOverride.upsert({
        where: { id },
        create: { id, ...fields, updatedBy: actor },
        update: { ...fields, updatedBy: actor, version: { increment: 1 } },
      });
      const entries = diffFields("maintenance", id, before ?? {}, fields);
      await recordChanges(entries, actor);
      return entries.length;
    });
  }

  if (body.kind === "consulting") {
    const { id } = body;
    const fields = {
      price: body.price,
      durationBusinessDays: body.durationBusinessDays,
      status: body.status,
    };
    return prisma.$transaction(async (tx) => {
      const before = await tx.consultingPackageOverride.findUnique({ where: { id } });
      await tx.consultingPackageOverride.upsert({
        where: { id },
        create: { id, ...fields, updatedBy: actor },
        update: { ...fields, updatedBy: actor, version: { increment: 1 } },
      });
      const entries = diffFields("consulting", id, before ?? {}, fields);
      await recordChanges(entries, actor);
      return entries.length;
    });
  }

  const { id } = body;
  const fields = {
    costBasis: body.costBasis,
    markupType: body.markupType,
    markupValue: body.markupValue,
    billingCycle: body.billingCycle,
    status: body.status,
  };
  return prisma.$transaction(async (tx) => {
    const before = await tx.addonOverride.findUnique({ where: { id } });
    await tx.addonOverride.upsert({
      where: { id },
      create: { id, ...fields, updatedBy: actor },
      update: { ...fields, updatedBy: actor, version: { increment: 1 } },
    });
    const entries = diffFields("addon", id, before ?? {}, fields);
    await recordChanges(entries, actor);
    return entries.length;
  });
}
