import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  // native / wasm packages must be required by Node, not bundled
  serverExternalPackages: ["@electric-sql/pglite", "postgres"],
  // AWS / Sentry 樹在 Windows 上路徑太長，standalone 也打包不了。
  // 前台頁面不該載入它們；R2 上傳走動態 import，沒設 R2 就用不到。
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
