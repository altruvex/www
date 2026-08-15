import { mkdir, writeFile } from "fs/promises";
import path from "path";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";

function getR2Client(): { client: S3Client; bucket: string; publicUrl: string } | null {
  const accountId = process.env.R2_ACCOUNT_ID;
  const accessKeyId = process.env.R2_ACCESS_KEY_ID;
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;
  const bucket = process.env.R2_BUCKET_NAME;
  const publicUrl = process.env.R2_PUBLIC_URL;

  if (!accountId || !accessKeyId || !secretAccessKey || !bucket || !publicUrl) {
    return null;
  }

  const client = new S3Client({
    region: "auto",
    endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
    credentials: { accessKeyId, secretAccessKey },
  });

  return { client, bucket, publicUrl };
}

/**
 * Uploads a buffer and returns its public URL. Uses Cloudflare R2 when
 * R2_* env vars are configured (§10, §11.2 — zero egress fees). Falls back
 * to apps/admin/public/generated/ for local dev so the proposal/contract
 * pipeline is testable without live storage credentials — that fallback is
 * NOT suitable for production (files live inside the app deployment, not
 * durable object storage) and must be replaced by setting the R2 env vars.
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
    return `${r2.publicUrl.replace(/\/$/, "")}/${objectPath}`;
  }

  const destDir = path.join(process.cwd(), "public", "generated", path.dirname(objectPath));
  await mkdir(destDir, { recursive: true });
  const destPath = path.join(process.cwd(), "public", "generated", objectPath);
  await writeFile(destPath, buffer);
  return `/generated/${objectPath}`;
}
