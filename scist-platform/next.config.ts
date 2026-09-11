import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
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
