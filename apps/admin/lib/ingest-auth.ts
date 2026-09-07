import { createHash, randomBytes, timingSafeEqual } from "node:crypto";

import { prisma, type Product } from "@repo/database";

/**
 * Per-product bearer tokens for the CI ingest endpoints (§26).
 *
 * A build agent is not a person and must not hold an admin session, so builds,
 * deployments and logs authenticate with a token scoped to exactly one product.
 * A leaked token can write telemetry for that product and nothing else — it
 * cannot read a client, a price, or another product's history.
 *
 * The plaintext token is returned once, at issue time, and never stored: only
 * its SHA-256 and last four characters are persisted. The UI therefore has no
 * secret to leak (§26), and "show me the token again" is correctly impossible.
 */

const TOKEN_PREFIX = "avx_ingest_";

export function hashToken(token: string): string {
  return createHash("sha256").update(token, "utf8").digest("hex");
}

export interface IssuedToken {
  /** Shown to the operator exactly once. */
  token: string;
  hash: string;
  last4: string;
}

export function issueToken(): IssuedToken {
  const token = `${TOKEN_PREFIX}${randomBytes(32).toString("base64url")}`;
  return { token, hash: hashToken(token), last4: token.slice(-4) };
}

/** Constant-time compare of two hex digests of equal length. */
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

/**
 * Resolves the product a request is authorised to write to, or null.
 *
 * The lookup is by hash equality in the database (the column is unique), then
 * re-verified in constant time. The DB lookup alone would already be an
 * equality match on a digest — the second compare exists so that a future
 * change to a non-unique index cannot silently reintroduce a timing signal.
 */
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
