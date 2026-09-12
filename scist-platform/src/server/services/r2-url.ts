/**
 * R2 公開網址與檔名，不碰 AWS SDK。前台列表／詳情只需要這個。
 */
import { env } from "../env";

export function objectKeyFor(challengeSlug: string, fileName: string) {
  const safe = fileName.replace(/[^\w.\-]+/g, "_").slice(0, 120);
  return "challenges/" + challengeSlug + "/" + safe;
}

export function publicUrl(objectKey: string) {
  const base = env().R2_PUBLIC_URL;
  if (!base) return null;
  return base.replace(/\/$/, "") + "/" + objectKey;
}
