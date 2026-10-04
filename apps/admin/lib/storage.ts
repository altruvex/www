import { mkdir, writeFile } from "fs/promises";
import path from "path";
import { S3Client, PutObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

const OBJECT_SCHEME = "r2:";

export const DOCUMENT_URL_TTL_SECONDS = 60 * 60;

export const SHARED_URL_TTL_SECONDS = 7 * 24 * 60 * 60;

export type StorageConfig = {
  source: "neon" | "storage" | "r2" | null;
  endpoint: string | null;
  region: string;
  accessKeyId: string | null;
  secretAccessKey: string | null;
  bucket: string | null;
  publicUrl: string | null;
  private: boolean;
  missing: string[];
};

export function storageConfig(): StorageConfig {
  const e = process.env;
  const source = e.STORAGE_ENDPOINT
    ? "storage"
    : e.AWS_ENDPOINT_URL_S3
      ? "neon"
      : e.R2_ACCOUNT_ID
        ? "r2"
        : null;

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
    forcePathStyle: true,
  });

  return { client, bucket: config.bucket!, publicUrl: config.publicUrl, private: config.private };
}

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

function keyFor(stored: string, store: NonNullable<ReturnType<typeof getBucket>>): string | null {
  if (stored.startsWith(OBJECT_SCHEME)) return stored.slice(OBJECT_SCHEME.length);
  if (store.publicUrl && stored.startsWith(`${store.publicUrl}/`)) {
    return stored.slice(store.publicUrl.length + 1);
  }
  return null;
}

export async function documentUrl(
  stored: string | null | undefined,
  expiresIn: number = DOCUMENT_URL_TTL_SECONDS,
): Promise<string | null> {
  if (!stored) return null;

  const store = getBucket();
  if (!store) return stored.startsWith(OBJECT_SCHEME) ? null : stored;

  const key = keyFor(stored, store);
  if (!key) return stored;

  if (!store.private) return stored;

  return getSignedUrl(store.client, new GetObjectCommand({ Bucket: store.bucket, Key: key }), {
    expiresIn,
  });
}
