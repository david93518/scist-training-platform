/**
 * Cloudflare R2 — challenge attachments. S3-compatible, so we presign a PUT
 * and the browser uploads directly. Public reads go through R2_PUBLIC_URL
 * (a custom domain or the r2.dev URL on the bucket).
 */
import { S3Client, PutObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { env, features } from "../env";

let client: S3Client | null = null;

function s3() {
  if (client) return client;
  const { R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY } = env();
  client = new S3Client({
    region: "auto",
    endpoint: "https://" + R2_ACCOUNT_ID + ".r2.cloudflarestorage.com",
    credentials: { accessKeyId: R2_ACCESS_KEY_ID ?? "", secretAccessKey: R2_SECRET_ACCESS_KEY ?? "" },
  });
  return client;
}

export function objectKeyFor(challengeSlug: string, fileName: string) {
  const safe = fileName.replace(/[^\w.\-]+/g, "_").slice(0, 120);
  return "challenges/" + challengeSlug + "/" + safe;
}

export interface PresignedPut {
  mode: "direct" | "mock";
  uploadUrl?: string;
  objectKey: string;
}

export async function presignPut(objectKey: string, contentType: string): Promise<PresignedPut> {
  if (!features.r2()) return { mode: "mock", objectKey };
  const url = await getSignedUrl(
    s3(),
    new PutObjectCommand({ Bucket: env().R2_BUCKET, Key: objectKey, ContentType: contentType || "application/octet-stream" }),
    { expiresIn: 60 * 15 },
  );
  return { mode: "direct", uploadUrl: url, objectKey };
}

export async function deleteObject(objectKey: string) {
  if (!features.r2()) return;
  await s3().send(new DeleteObjectCommand({ Bucket: env().R2_BUCKET, Key: objectKey }));
}

export function publicUrl(objectKey: string) {
  const base = env().R2_PUBLIC_URL;
  if (!base) return null;
  return base.replace(/\/$/, "") + "/" + objectKey;
}
