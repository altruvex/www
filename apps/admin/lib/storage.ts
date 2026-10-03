import { mkdir, writeFile } from "fs/promises";
import path from "path";
import { S3Client, PutObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

/**
 * Client documents: proposals and contracts.
 *
 * Storage is any S3-compatible bucket — Neon, Cloudflare R2, AWS S3, MinIO —
 * so changing provider is a change of configuration, not of code. The
 * connection is read from the first of these that is present, never mixed:
 *
 *  1. **Neon's own block**, pasted as the console hands it out:
 *       AWS_ENDPOINT_URL_S3, AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, AWS_REGION
 *     These are the standard AWS names. Hosts that reserve them (Vercel does)
 *     cannot set them, which is what 2 is for.
 *  2. **STORAGE_ENDPOINT, STORAGE_ACCESS_KEY_ID, STORAGE_SECRET_ACCESS_KEY,
 *     STORAGE_REGION** — the same four values under names no host claims.
 *     When STORAGE_ENDPOINT is set it wins over 1.
 *  3. **The older R2_* names** (R2_ACCOUNT_ID, R2_BUCKET_NAME, …), so a
 *     deployment configured before any of this keeps its bucket.
 *
 * The rest belongs to this app, not to the provider, so it has one name:
 *
 *   STORAGE_BUCKET             the bucket (R2_BUCKET_NAME under 3)
 *   STORAGE_PRIVATE            "true" in production
 *   STORAGE_PUBLIC_URL         public mode only
 *
 * Two modes, chosen by configuration:
 *
 *  - **Private (STORAGE_PRIVATE=true).** The object is stored under an opaque
 *    key and the row holds `r2:<key>`, which is not a URL and cannot be opened
 *    by anyone who sees it. Every reader asks `documentUrl()` for a signed link
 *    that expires. This is what production should run.
 *  - **Public (default).** The row holds `${STORAGE_PUBLIC_URL}/<key>` exactly
 *    as before. Kept so an existing deployment keeps working, and so rows
 *    written before the switch still resolve — `documentUrl()` signs those too
 *    once the bucket goes private, by stripping the known prefix back to a key.
 *
 * Local development with no bucket configured still writes to
 * `public/generated/**`, which the proxy keeps behind the admin session.
 */

/**
 * The prefix on a private reference. It says "an object in our bucket", not
 * "an object in R2": rows already carry it, so it stays whatever the provider.
 */
const OBJECT_SCHEME = "r2:";

/** How long a signed document link lives when a person is looking at it. */
export const DOCUMENT_URL_TTL_SECONDS = 60 * 60;

/**
 * How long a link inside an email or a WhatsApp message lives. Longer, because
 * a client opens a proposal days after it lands; seven days is the ceiling
 * SigV4 allows, and the sign and portal links have their own windows anyway.
 */
export const SHARED_URL_TTL_SECONDS = 7 * 24 * 60 * 60;

export type StorageConfig = {
  /** Which set of names the connection came from, or null if none is set. */
  source: "neon" | "storage" | "r2" | null;
  endpoint: string | null;
  region: string;
  accessKeyId: string | null;
  secretAccessKey: string | null;
  bucket: string | null;
  publicUrl: string | null;
  private: boolean;
  /** Settings still needed before files leave local disk; empty when ready. */
  missing: string[];
};

/**
 * Reads the bucket settings. The one place that knows the variable names, so
 * the health check reports exactly what `upload()` would refuse over.
 */
export function storageConfig(): StorageConfig {
  const e = process.env;
  const source = e.STORAGE_ENDPOINT
    ? "storage"
    : e.AWS_ENDPOINT_URL_S3
      ? "neon"
      : e.R2_ACCOUNT_ID
        ? "r2"
        : null;

  // One source supplies all four connection values, so a key from one
  // provider is never sent to another's endpoint.
  const connection =
    source === "storage"
      ? {
          endpoint: e.STORAGE_ENDPOINT,
          accessKeyId: e.STORAGE_ACCESS_KEY_ID,
          secretAccessKey: e.STORAGE_SECRET_ACCESS_KEY,
          region: e.STORAGE_REGION,
        }
      : source === "neon"
        ? {
            endpoint: e.AWS_ENDPOINT_URL_S3,
            accessKeyId: e.AWS_ACCESS_KEY_ID,
            secretAccessKey: e.AWS_SECRET_ACCESS_KEY,
            region: e.AWS_REGION,
          }
        : source === "r2"
          ? {
              endpoint: `https://${e.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
              accessKeyId: e.R2_ACCESS_KEY_ID,
              secretAccessKey: e.R2_SECRET_ACCESS_KEY,
              region: undefined,
            }
          : { endpoint: undefined, accessKeyId: undefined, secretAccessKey: undefined, region: undefined };

  const legacy = source === "r2";
  const endpoint = connection.endpoint?.replace(/\/$/, "") || null;
  const accessKeyId = connection.accessKeyId || null;
  const secretAccessKey = connection.secretAccessKey || null;
  const bucket = e.STORAGE_BUCKET || (legacy ? e.R2_BUCKET_NAME : undefined) || null;
  const publicUrl =
    (e.STORAGE_PUBLIC_URL || (legacy ? e.R2_PUBLIC_URL : undefined))?.replace(/\/$/, "") || null;
  const isPrivate = (e.STORAGE_PRIVATE ?? (legacy ? e.R2_PRIVATE : undefined)) === "true";

  const missing: string[] = [];
  if (!endpoint) missing.push("AWS_ENDPOINT_URL_S3");
  if (!accessKeyId) missing.push(source === "storage" ? "STORAGE_ACCESS_KEY_ID" : "AWS_ACCESS_KEY_ID");
  if (!secretAccessKey) {
    missing.push(source === "storage" ? "STORAGE_SECRET_ACCESS_KEY" : "AWS_SECRET_ACCESS_KEY");
  }
  if (!bucket) missing.push("STORAGE_BUCKET");
  // A public deployment still needs a public URL to build a readable link;
  // a private one does not, and must not be held back by its absence.
  if (!isPrivate && !publicUrl) missing.push("STORAGE_PUBLIC_URL");

  return {
    source,
    endpoint,
    region: connection.region || "auto",
    accessKeyId,
    secretAccessKey,
    bucket,
    publicUrl,
    private: isPrivate,
    missing,
  };
}

function getBucket(): {
  client: S3Client;
  bucket: string;
  publicUrl: string | null;
  private: boolean;
} | null {
  const config = storageConfig();
  if (config.missing.length > 0) return null;

  const client = new S3Client({
    region: config.region,
    endpoint: config.endpoint!,
    credentials: { accessKeyId: config.accessKeyId!, secretAccessKey: config.secretAccessKey! },
    // `endpoint/bucket/key` rather than `bucket.endpoint/key`. Neon storage
    // requires it; R2, S3 and MinIO all accept it, so one form serves every
    // provider and switching never depends on the bucket's DNS.
    forcePathStyle: true,
  });

  return { client, bucket: config.bucket!, publicUrl: config.publicUrl, private: config.private };
}

/**
 * Uploads a buffer and returns the value to store on the row — a signed-on-read
 * reference in private mode, a public URL otherwise.
 */
export async function upload(
  buffer: Buffer,
  objectPath: string,
  contentType: string,
): Promise<string> {
  const store = getBucket();

  if (store) {
    await store.client.send(
      new PutObjectCommand({
        Bucket: store.bucket,
        Key: objectPath,
        Body: buffer,
        ContentType: contentType,
      }),
    );
    return store.private ? `${OBJECT_SCHEME}${objectPath}` : `${store.publicUrl}/${objectPath}`;
  }

  const destDir = path.join(process.cwd(), "public", "generated", path.dirname(objectPath));
  await mkdir(destDir, { recursive: true });
  const destPath = path.join(process.cwd(), "public", "generated", objectPath);
  await writeFile(destPath, buffer);
  return `/generated/${objectPath}`;
}

/** The object key a stored value refers to, or null if it is not an object in our bucket. */
function keyFor(stored: string, store: NonNullable<ReturnType<typeof getBucket>>): string | null {
  if (stored.startsWith(OBJECT_SCHEME)) return stored.slice(OBJECT_SCHEME.length);
  if (store.publicUrl && stored.startsWith(`${store.publicUrl}/`)) {
    return stored.slice(store.publicUrl.length + 1);
  }
  return null;
}

/**
 * Turns a stored reference into something a browser can open.
 *
 * Call this at every point a document URL leaves the server. A stored value
 * that is already a URL (public mode, or the local `/generated` fallback) is
 * returned unchanged, so call sites do not have to know which mode is running.
 */
export async function documentUrl(
  stored: string | null | undefined,
  expiresIn: number = DOCUMENT_URL_TTL_SECONDS,
): Promise<string | null> {
  if (!stored) return null;

  const store = getBucket();
  if (!store) return stored.startsWith(OBJECT_SCHEME) ? null : stored;

  const key = keyFor(stored, store);
  if (!key) return stored;

  // In public mode the stored URL is already openable; signing it would only
  // add an expiry to a link that does not need one.
  if (!store.private) return stored;

  return getSignedUrl(store.client, new GetObjectCommand({ Bucket: store.bucket, Key: key }), {
    expiresIn,
  });
}
