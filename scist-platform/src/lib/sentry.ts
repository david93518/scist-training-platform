/**
 * Sentry 開關。DSN 沒填時整套是空操作，本機與 CI 不必為了監控申請帳號。
 *
 * DSN 本來就可以公開（只能寫事件、不能讀），所以 client / server 共用
 * NEXT_PUBLIC_SENTRY_DSN；伺服器也可以另外用 SENTRY_DSN 蓋過去。
 */
export function sentryDsn(): string | undefined {
  return process.env.SENTRY_DSN || process.env.NEXT_PUBLIC_SENTRY_DSN || undefined;
}

export function sentryEnabled(): boolean {
  return Boolean(sentryDsn());
}

export function sentryInitOptions() {
  const dsn = sentryDsn();
  return {
    dsn,
    enabled: Boolean(dsn),
    environment: process.env.SENTRY_ENVIRONMENT || process.env.VERCEL_ENV || process.env.NODE_ENV,
    // 高中生站，不上報個資與 HTTP body
    sendDefaultPii: false,
    tracesSampleRate: process.env.NODE_ENV === "production" ? 0.1 : 0,
  };
}
