import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  // native / wasm packages must be required by Node, not bundled
  serverExternalPackages: ["@electric-sql/pglite", "postgres"],
  // 有設 R2 / Sentry 時這些套件一定要在 standalone 裡。
  // 前台列表只讀 r2-url，不會在 SSR 載入 S3。
  outputFileTracingIncludes: {
    "/api/admin/uploads/file": [
      "./node_modules/@aws-sdk/client-s3/**",
      "./node_modules/@aws-sdk/s3-request-presigner/**",
      "./node_modules/@smithy/**",
    ],
  },
};

export default nextConfig;
