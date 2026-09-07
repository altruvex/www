import { NextResponse } from "next/server";
import { z } from "zod";

import { prisma, type Product } from "@repo/database";

import { integrationActor, recordActivity } from "@/lib/activity-log";
import { productForIngestToken } from "@/lib/ingest-auth";

/**
 * Shared plumbing for `/api/ingest/*` (§7).
 *
 * These endpoints are the only writers of build, deployment and log rows. The
 * admin UI deliberately cannot create them: a deployment record that a human
 * typed is a claim, not evidence, and the whole point of this section of the OS
 * is that what it shows actually happened.
 *
 * Until a pipeline is pointed at these endpoints the tables stay empty and the
 * screens say so, rather than being seeded with plausible-looking history.
 */

export const ENVIRONMENTS = ["PRODUCTION", "STAGING", "PREVIEW"] as const;

export const environmentSchema = z.enum(ENVIRONMENTS).default("PRODUCTION");

/** Bounded so one runaway CI job cannot fill the table with a single request. */
export const MAX_LOG_BATCH = 500;

/**
 * Cap on a single log message, in characters. A stack trace is welcome; a
 * base64 payload is not — this is a log table, not a blob store.
 */
export const MAX_LOG_MESSAGE_LENGTH = 10_000;

export interface IngestContext {
  product: Product;
}

export type IngestHandler = (
  request: Request,
  context: IngestContext,
) => Promise<NextResponse> | NextResponse;

/**
 * Authenticates by product ingest token and hands the handler the product.
 *
 * A 401 here is deliberately identical for "no token", "malformed token" and
 * "unknown token" — an unauthenticated caller learns nothing about which
 * products exist.
 */
export function withIngestToken(handler: IngestHandler) {
  return async (request: Request): Promise<NextResponse> => {
    const product = await productForIngestToken(request.headers);
    if (!product) {
      return NextResponse.json(
        { success: false, message: "Invalid or missing ingest token." },
        { status: 401 },
      );
    }

    try {
      return await handler(request, { product });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return NextResponse.json(
          { success: false, message: "Invalid payload.", issues: error.issues },
          { status: 400 },
        );
      }
      console.error(`Ingest failed for product ${product.slug}`, error);
      return NextResponse.json(
        { success: false, message: "Ingest failed. The error has been logged." },
        { status: 500 },
      );
    }
  };
}

export async function readIngestJson<T>(request: Request, schema: z.ZodType<T>): Promise<T> {
  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    throw new z.ZodError([
      { code: "custom", path: [], message: "Body must be valid JSON." },
    ]);
  }
  return schema.parse(raw);
}

/**
 * Allocates the next per-product sequence number for builds, deployments and
 * incidents.
 *
 * Runs inside the caller's transaction and takes a row lock on the product, so
 * two CI jobs finishing at the same instant cannot both claim number 42 and
 * trip the `@@unique([productId, number])` constraint.
 */
export async function nextNumber(
  tx: Parameters<Parameters<typeof prisma.$transaction>[0]>[0],
  table: "builds" | "deployments" | "incidents",
  productId: string,
): Promise<number> {
  await tx.$queryRawUnsafe(`SELECT id FROM products WHERE id = $1 FOR UPDATE`, productId);
  const rows = await tx.$queryRawUnsafe<{ max: number | null }[]>(
    `SELECT MAX("number") AS max FROM "${table}" WHERE "productId" = $1`,
    productId,
  );
  return (rows[0]?.max ?? 0) + 1;
}

export const ingestActor = (product: Product) =>
  integrationActor(`CI · ${product.slug}`);

export { recordActivity };
