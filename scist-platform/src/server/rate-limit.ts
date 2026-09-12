/**
 * Process 內計數限流。登入 / 註冊這種還沒有 user id 的請求用這個。
 * Serverless 上每個 instance 各算各的，所以是擋爆破，不是精確配額。
 *
 * 重要：**不要用 IP 當成猜密碼的計數單位**。一間學校整班共用一個對外 IP，
 * 把上限訂在「每個 IP 幾次」會讓第九個登入的同學被鎖在門外。猜密碼要擋的是
 * 「同一個帳號一直被試」，所以那條線掛在 handle 上，而且只算失敗的那幾次；
 * IP 那條線放寬，只負責擋洪水。
 */
const buckets = new Map<string, number[]>();

/** Every key that ever hit the limiter stays in the Map, so sweep the stale ones. */
function sweep(now: number, windowMs: number) {
  if (buckets.size < 5000) return;
  for (const [key, hits] of buckets) {
    if (!hits.some((t) => now - t < windowMs)) buckets.delete(key);
  }
}

function recent(key: string, now: number, windowMs: number) {
  const hits = (buckets.get(key) ?? []).filter((t) => now - t < windowMs);
  buckets.set(key, hits);
  return hits;
}

/** Records one hit and reports whether it stayed within the limit. */
export function hitRateLimit(key: string, limit: number, windowMs: number): boolean {
  const now = Date.now();
  sweep(now, windowMs);
  const hits = recent(key, now, windowMs);
  if (hits.length >= limit) return false;
  hits.push(now);
  return true;
}

/** True when the key is already at its limit. Does NOT consume an attempt. */
export function isRateLimited(key: string, limit: number, windowMs: number): boolean {
  const now = Date.now();
  sweep(now, windowMs);
  return recent(key, now, windowMs).length >= limit;
}

/** Counts one attempt against the key. Use for failures only, after the fact. */
export function recordAttempt(key: string, windowMs: number) {
  const now = Date.now();
  sweep(now, windowMs);
  recent(key, now, windowMs).push(now);
}

/** Forget a key's history, e.g. once the person finally signed in. */
export function clearRateLimit(key: string) {
  buckets.delete(key);
}

export function clientIp(req: Request): string {
  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0]?.trim() || "unknown";
  return req.headers.get("x-real-ip")?.trim() || "unknown";
}
