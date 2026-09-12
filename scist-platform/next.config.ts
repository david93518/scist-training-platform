import type { NextConfig } from "next";

const isDev = process.env.NODE_ENV === "development";

/** R2 公開網域（圖片 / 附件來源），沒設就不放進 CSP。 */
function r2Origin(): string | null {
  try {
    const raw = process.env.R2_PUBLIC_URL?.trim();
    return raw ? new URL(raw).origin : null;
  } catch {
    return null;
  }
}

/**
 * 安全標頭。ZAP / Nikto 掃描指出 X-Frame-Options、CSP、X-Content-Type-Options、
 * Permissions-Policy 缺失，在這裡一次補齊。
 *
 * CSP 白名單只放前端實際用到的外部來源：
 * - embed.cloudflarestream.com：Stream 播放器 SDK（script）
 * - customer-*.cloudflarestream.com：影片 iframe / 縮圖（frame、img、media）
 * - cdn.discordapp.com：Discord 登入者的頭像（img）
 * - *.r2.cloudflarestorage.com：瀏覽器對 presigned URL 直接 PUT（connect）
 * - *.ingest[.us].sentry.io：Sentry 事件上報（connect）
 *
 * 刻意「不」設 Cross-Origin-Embedder-Policy: require-corp —— Discord 頭像與
 * Stream iframe 沒有回 CORP 標頭，設了會把它們全部擋掉。
 */
function contentSecurityPolicy(): string {
  const r2 = r2Origin();
  const rules: Record<string, string[]> = {
    "default-src": ["'self'"],
    // Next.js  hydration 需要 inline script；dev 的 Turbopack HMR 需要 eval
    "script-src": ["'self'", "'unsafe-inline'", "https://embed.cloudflarestream.com", ...(isDev ? ["'unsafe-eval'"] : [])],
    "style-src": ["'self'", "'unsafe-inline'"],
    "img-src": ["'self'", "data:", "blob:", "https://cdn.discordapp.com", "https://*.cloudflarestream.com", ...(r2 ? [r2] : [])],
    "font-src": ["'self'", "data:"],
    "connect-src": [
      "'self'",
      "https://*.r2.cloudflarestorage.com",
      "https://*.ingest.sentry.io",
      "https://*.ingest.us.sentry.io",
      // dev 的 HMR 走 WebSocket
      ...(isDev ? ["ws:", "wss:"] : []),
    ],
    "frame-src": ["https://customer-*.cloudflarestream.com", "https://embed.cloudflarestream.com"],
    "media-src": ["'self'", "https://customer-*.cloudflarestream.com"],
    "object-src": ["'none'"],
    "base-uri": ["'self'"],
    "form-action": ["'self'"],
    "frame-ancestors": ["'none'"],
  };
  return Object.entries(rules)
    .map(([k, v]) => k + " " + v.join(" "))
    .join("; ");
}

const securityHeaders = [
  { key: "Content-Security-Policy", value: contentSecurityPolicy() },
  // 舊瀏覽器的防點擊劫持；新瀏覽器看 CSP 的 frame-ancestors
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=(), usb=()" },
  { key: "Cross-Origin-Opener-Policy", value: "same-origin-allow-popups" },
  { key: "Cross-Origin-Resource-Policy", value: "same-site" },
  // HSTS 只在正式站開；本機 HTTP 開發不受影響（瀏覽器本來就忽略 HTTP 上的 HSTS）
  ...(!isDev ? [{ key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" }] : []),
];

const nextConfig: NextConfig = {
  output: "standalone",
  // 不回 X-Powered-By: Next.js，少給攻擊者一點指紋
  poweredByHeader: false,
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
  // native / wasm packages must be required by Node, not bundled
  serverExternalPackages: ["@electric-sql/pglite", "postgres"],
  // 不能用 outputFileTracingIncludes 把 @smithy/** 拉進來：Turbopack NFT
  // 會把 pnpm 的 @smithy/core 目錄當成檔案 hash，CI 直接 FATAL。
  // 前台不載入 S3；正式機有設 R2 / Sentry 時由 deploy_vm.py 從 pnpm 補進包。
  outputFileTracingExcludes: {
    "*": [
      "node_modules/@aws-sdk/**",
      "node_modules/@smithy/**",
      "node_modules/@aws+*/**",
      "node_modules/@sentry/**",
      "node_modules/@opentelemetry/**",
    ],
  },
};

export default nextConfig;
