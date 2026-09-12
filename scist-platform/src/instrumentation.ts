/**
 * Next 會在每個 server / edge process 啟動時呼叫一次。
 * 沒設 DSN 時不載入 Sentry，正式站不必為了監控多裝一套套件。
 */
export async function register() {
  if (!process.env.SENTRY_DSN && !process.env.NEXT_PUBLIC_SENTRY_DSN) return;
  if (process.env.NEXT_RUNTIME === "nodejs") {
    await import("../sentry.server.config");
  }
  if (process.env.NEXT_RUNTIME === "edge") {
    await import("../sentry.edge.config");
  }
}

export async function onRequestError(...args: unknown[]) {
  if (!process.env.SENTRY_DSN && !process.env.NEXT_PUBLIC_SENTRY_DSN) return;
  const Sentry = await import("@sentry/nextjs");
  return (Sentry.captureRequestError as (...a: unknown[]) => unknown)(...args);
}
