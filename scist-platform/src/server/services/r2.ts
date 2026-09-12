/**
 * Cloudflare R2 — challenge attachments. S3-compatible, so we presign a PUT
 * and the browser uploads directly. Public reads go through R2_PUBLIC_URL
 * (a custom domain or the r2.dev URL on the bucket).
 *
 * AWS SDK 只在真的上傳／刪檔時才載入，避免每一頁 SSR 都把 @aws-sdk 整包拉進來
 * （standalone 部署在 Windows 上也打包不了那棵樹）。
 */
import { env, features } from "../env";
export { objectKeyFor, publicUrl } from "./r2-url";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let client: any = null;

async function s3() {
  if (client) return client;
  const { S3Client } = await import("@aws-sdk/client-s3");
  const { R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY } = env();
  client = new S3Client({
    region: "auto",
    endpoint: "https://" + R2_ACCOUNT_ID + ".r2.cloudflarestorage.com",
    credentials: { accessKeyId: R2_ACCESS_KEY_ID ?? "", secretAccessKey: R2_SECRET_ACCESS_KEY ?? "" },
  });
  return client;
}


export interface PresignedPut {
  mode: "direct" | "mock";
  uploadUrl?: string;
  objectKey: string;
}

export async function presignPut(objectKey: string, contentType: string): Promise<PresignedPut> {
  if (!features.r2()) return { mode: "mock", objectKey };
  const { PutObjectCommand } = await import("@aws-sdk/client-s3");
  const { getSignedUrl } = await import("@aws-sdk/s3-request-presigner");
  const url = await getSignedUrl(
    await s3(),
    new PutObjectCommand({ Bucket: env().R2_BUCKET, Key: objectKey, ContentType: contentType || "application/octet-stream" }),
    { expiresIn: 60 * 15 },
  );
  return { mode: "direct", uploadUrl: url, objectKey };
}

export async function deleteObject(objectKey: string) {
  if (!features.r2()) return;
  const { DeleteObjectCommand } = await import("@aws-sdk/client-s3");
  await (await s3()).send(new DeleteObjectCommand({ Bucket: env().R2_BUCKET, Key: objectKey }));
}

