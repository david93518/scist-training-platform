/**
 * Process 內計數限流。登入 / 註冊這種還沒有 user id 的請求用這個。
 * Serverless 上每個 instance 各算各的，所以是擋爆破，不是精確配額。
 */
const buckets = new Map<string, number[]>();

export function hitRateLimit(key: string, limit: number, windowMs: number): boolean {
  const now = Date.now();
  const hits = (buckets.get(key) ?? []).filter((t) => now - t < windowMs);
  if (hits.length >= limit) {
    buckets.set(key, hits);
    return false;
  }
  hits.push(now);
  buckets.set(key, hits);
  return true;
}

export function clientIp(req: Request): string {
  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0]?.trim() || "unknown";
  return req.headers.get("x-real-ip")?.trim() || "unknown";
}
