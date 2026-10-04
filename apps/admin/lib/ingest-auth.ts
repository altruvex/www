import { createHash, randomBytes, timingSafeEqual } from "node:crypto";

import { prisma, type Product } from "@repo/database";

const TOKEN_PREFIX = "avx_ingest_";

export function hashToken(token: string): string {
  return createHash("sha256").update(token, "utf8").digest("hex");
}

export interface IssuedToken {
  token: string;
  hash: string;
  last4: string;
}

export function issueToken(): IssuedToken {
  const token = `${TOKEN_PREFIX}${randomBytes(32).toString("base64url")}`;
  return { token, hash: hashToken(token), last4: token.slice(-4) };
}

function hashesMatch(a: string, b: string): boolean {
  const bufA = Buffer.from(a, "hex");
  const bufB = Buffer.from(b, "hex");
  if (bufA.length !== bufB.length || bufA.length === 0) return false;
  return timingSafeEqual(bufA, bufB);
}

export function bearerFrom(headers: Headers): string | null {
  const raw = headers.get("authorization");
  if (!raw) return null;
  const [scheme, ...rest] = raw.split(" ");
  if (!scheme || scheme.toLowerCase() !== "bearer") return null;
  const token = rest.join(" ").trim();
  return token.length > 0 ? token : null;
}

export async function productForIngestToken(
  headers: Headers,
): Promise<Product | null> {
  const token = bearerFrom(headers);
  if (!token || !token.startsWith(TOKEN_PREFIX)) return null;

  const hash = hashToken(token);
  const product = await prisma.product.findUnique({ where: { ingestTokenHash: hash } });
  if (!product?.ingestTokenHash) return null;
  if (!hashesMatch(product.ingestTokenHash, hash)) return null;

  return product;
}
