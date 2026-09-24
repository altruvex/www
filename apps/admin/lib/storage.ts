import { mkdir, writeFile } from "fs/promises";
import path from "path";
import { S3Client, PutObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

/**
 * Client documents: proposals and contracts.
 *
 * Two modes, chosen by configuration:
 *
 *  - **Private (R2_PRIVATE=true).** The object is stored under an opaque key
 *    and the row holds `r2:<key>`, which is not a URL and cannot be opened by
 *    anyone who sees it. Every reader asks `documentUrl()` for a signed link
 *    that expires. This is what production should run.
 *  - **Public (default).** The row holds `${R2_PUBLIC_URL}/<key>` exactly as
 *    before. Kept so an existing deployment keeps working, and so rows written
 *    before the switch still resolve — `documentUrl()` signs those too once the
 *    bucket goes private, by stripping the known prefix back to a key.
 *
 * Local development with no R2 configured still writes to
 * `public/generated/**`, which the proxy keeps behind the admin session.
 */

const R2_SCHEME = "r2:";

/** How long a signed document link lives when a person is looking at it. */
export const DOCUMENT_URL_TTL_SECONDS = 60 * 60;

/**
 * How long a link inside an email or a WhatsApp message lives. Longer, because
 * a client opens a proposal days after it lands; seven days is the ceiling
 * SigV4 allows, and the sign and portal links have their own windows anyway.
 */
export const SHARED_URL_TTL_SECONDS = 7 * 24 * 60 * 60;

function getR2Client(): {
  client: S3Client;
  bucket: string;
  publicUrl: string | null;
  private: boolean;
} | null {
  const accountId = process.env.R2_ACCOUNT_ID;
  const accessKeyId = process.env.R2_ACCESS_KEY_ID;
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;
  const bucket = process.env.R2_BUCKET_NAME;
  const publicUrl = process.env.R2_PUBLIC_URL?.replace(/\/$/, "") || null;
  const isPrivate = process.env.R2_PRIVATE === "true";

  // A public deployment still needs R2_PUBLIC_URL to build a readable link;
  // a private one does not, and must not be held back by its absence.
  if (!accountId || !accessKeyId || !secretAccessKey || !bucket) return null;
  if (!isPrivate && !publicUrl) return null;

  const client = new S3Client({
    region: "auto",
    endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
    credentials: { accessKeyId, secretAccessKey },
  });

  return { client, bucket, publicUrl, private: isPrivate };
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
  const r2 = getR2Client();

  if (r2) {
    await r2.client.send(
      new PutObjectCommand({
        Bucket: r2.bucket,
        Key: objectPath,
        Body: buffer,
        ContentType: contentType,
      }),
    );
    return r2.private ? `${R2_SCHEME}${objectPath}` : `${r2.publicUrl}/${objectPath}`;
  }

  const destDir = path.join(process.cwd(), "public", "generated", path.dirname(objectPath));
  await mkdir(destDir, { recursive: true });
  const destPath = path.join(process.cwd(), "public", "generated", objectPath);
  await writeFile(destPath, buffer);
  return `/generated/${objectPath}`;
}

/** The object key a stored value refers to, or null if it is not an R2 object. */
function keyFor(stored: string, r2: NonNullable<ReturnType<typeof getR2Client>>): string | null {
  if (stored.startsWith(R2_SCHEME)) return stored.slice(R2_SCHEME.length);
  if (r2.publicUrl && stored.startsWith(`${r2.publicUrl}/`)) {
    return stored.slice(r2.publicUrl.length + 1);
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

  const r2 = getR2Client();
  if (!r2) return stored.startsWith(R2_SCHEME) ? null : stored;

  const key = keyFor(stored, r2);
  if (!key) return stored;

  // In public mode the stored URL is already openable; signing it would only
  // add an expiry to a link that does not need one.
  if (!r2.private) return stored;

  return getSignedUrl(r2.client, new GetObjectCommand({ Bucket: r2.bucket, Key: key }), {
    expiresIn,
  });
}
