import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // native / wasm packages must be required by Node, not bundled
  serverExternalPackages: ["@electric-sql/pglite", "postgres"],
};

export default nextConfig;
