/**
 * Validates a post-login destination.
 *
 * Only a path inside this site is allowed. Checking `startsWith("/")` and
 * rejecting a leading `//` is not enough: browsers normalise a backslash to a
 * slash, so `/\evil.com` becomes `//evil.com` — a protocol-relative URL that
 * leaves the site. Backslashes, control characters (a browser strips tabs and
 * newlines before parsing, which can smuggle a `//` past a naive check) and
 * anything that changes origin once parsed are all refused.
 *
 * Checking the input is not enough either: path resolution can *create* a
 * protocol-relative path out of one that started off path-absolute.
 * `new URL("/..//evil.example", base)` keeps the base origin — so an origin
 * check passes — while its pathname normalises to `//evil.example`. The result
 * is therefore re-checked, which also makes this function idempotent.
 */
const DUMMY_ORIGIN = "https://scist.invalid";

function hasControlChar(value: string) {
  for (let i = 0; i < value.length; i++) {
    const code = value.charCodeAt(i);
    if (code < 0x20 || code === 0x7f) return true;
  }
  return false;
}

export function safeNextPath(raw: string | null | undefined): string | null {
  if (!raw || raw.length > 512) return null;
  if (hasControlChar(raw)) return null;
  if (raw.includes("\\")) return null;
  if (!raw.startsWith("/") || raw.startsWith("//")) return null;
  try {
    const url = new URL(raw, DUMMY_ORIGIN);
    if (url.origin !== DUMMY_ORIGIN) return null;
    // `/..//evil.example` survives the checks above but normalises to
    // `//evil.example`, which navigates off-site. pathname is the only part
    // that can start with `//`.
    if (url.pathname.startsWith("//")) return null;
    return url.pathname + url.search + url.hash;
  } catch {
    return null;
  }
}
