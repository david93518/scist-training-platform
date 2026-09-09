import * as Sentry from "@sentry/nextjs";

/**
 * Next 會在每個 server / edge process 啟動時呼叫一次。
 * 沒設 DSN 時 Sentry.init 的 enabled 是 false，不會對外送任何東西。
 */
export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    await import("../sentry.server.config");
  }
  if (process.env.NEXT_RUNTIME === "edge") {
    await import("../sentry.edge.config");
  }
}

export const onRequestError = Sentry.captureRequestError;
