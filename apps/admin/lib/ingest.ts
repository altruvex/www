import { NextResponse } from "next/server";
import { z } from "zod";

import { prisma, type Product } from "@repo/database";

import { integrationActor, recordActivity } from "@/lib/activity-log";
import { productForIngestToken } from "@/lib/ingest-auth";

export const ENVIRONMENTS = ["PRODUCTION", "STAGING", "PREVIEW"] as const;

export const environmentSchema = z.enum(ENVIRONMENTS).default("PRODUCTION");

export const MAX_LOG_BATCH = 500;

export const MAX_LOG_MESSAGE_LENGTH = 10_000;

export const MAX_LOG_METADATA_BYTES = 8_000;

export interface IngestContext {
  product: Product;
}

export type IngestHandler = (
  request: Request,
  context: IngestContext,
) => Promise<NextResponse> | NextResponse;

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
      if (error instanceof PayloadTooLargeError) {
        return NextResponse.json(
          { success: false, message: error.message },
          { status: 413 },
        );
      }
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

export const MAX_INGEST_BODY_BYTES = 1_000_000;

export class PayloadTooLargeError extends Error {
  constructor() {
    super("Payload too large.");
    this.name = "PayloadTooLargeError";
  }
}

export async function readIngestJson<T>(request: Request, schema: z.ZodType<T>): Promise<T> {
  const declared = Number(request.headers.get("content-length") ?? "");
  if (Number.isFinite(declared) && declared > MAX_INGEST_BODY_BYTES) {
    throw new PayloadTooLargeError();
  }

  let raw: unknown;
  try {
    const text = await request.text();
    if (text.length > MAX_INGEST_BODY_BYTES) throw new PayloadTooLargeError();
    raw = JSON.parse(text);
  } catch (error) {
    if (error instanceof PayloadTooLargeError) throw error;
    throw new z.ZodError([
      { code: "custom", path: [], message: "Body must be valid JSON." },
    ]);
  }
  return schema.parse(raw);
}

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
