/**
 * Session cookie name and signing key. Shared by auth.ts and proxy.ts and kept
 * free of database imports so the request proxy stays light.
 */
export const SESSION_COOKIE = "scist_session";

export function sessionSecretBytes() {
  const raw = process.env.AUTH_SECRET ?? (process.env.NODE_ENV === "production" ? "" : "dev-secret-not-for-production-use-32ch");
  if (!raw) throw new Error("AUTH_SECRET is required in production");
  return new TextEncoder().encode(raw);
}
