/**
 * Per-instance TTL memo for the public read paths.
 *
 * The homepage fires eight queries per request, and none of those numbers need
 * to be a second old. Wrapping them here turns a burst of visitors into one
 * round trip per key per window, which is what keeps a free-tier Neon
 * connection pool alive on the day a link gets shared in a school group chat.
 *
 * Deliberately not `unstable_cache` / `"use cache"`: those need
 * `cacheComponents`, which changes rendering semantics across every page and
 * wants Suspense boundaries we have not written. This is a plain Map, so it
 * dies with the process and is per-instance on serverless — fine, because
 * every entry is a public read whose worst case is being a few seconds stale.
 *
 * Never put per-user data in here. The key has no notion of who is asking.
 */

/** Cached promises, not values, so concurrent callers share one query. */
const store = new Map<string, { at: number; value: Promise<unknown> }>();

/** 開發時關掉，不然改完內容要等 TTL 過才看得到，很難 debug。 */
const enabled = process.env.NODE_ENV === "production";

export async function cached<T>(key: string, ttlMs: number, load: () => Promise<T>): Promise<T> {
  if (!enabled) return load();

  const hit = store.get(key);
  if (hit && Date.now() - hit.at < ttlMs) return hit.value as Promise<T>;

  const value = load();
  store.set(key, { at: Date.now(), value });
  // 失敗不要留在快取裡，否則整個 TTL 內每個人都吃到同一個錯誤
  value.catch(() => {
    if (store.get(key)?.value === value) store.delete(key);
  });
  return value;
}

/** Drop everything whose key starts with `prefix`; no argument clears all. */
export function invalidate(prefix?: string) {
  if (!prefix) return store.clear();
  for (const key of store.keys()) if (key.startsWith(prefix)) store.delete(key);
}

/** TTLs are short on purpose: this is about surviving bursts, not freshness. */
export const TTL = {
  /** 課程與題目，後台存檔時會另外 invalidate */
  content: 60_000,
  /** 排行榜、活動牆、首頁數字 */
  stats: 30_000,
  settings: 60_000,
} as const;
