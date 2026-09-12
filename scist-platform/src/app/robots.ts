import type { MetadataRoute } from "next";
import { siteUrl } from "@/server/env";

export default function robots(): MetadataRoute.Robots {
  const base = siteUrl();
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      // the console, the API and the signed-in-only pages have nothing to index
      disallow: ["/admin", "/admin/", "/api/", "/dashboard"],
    },
    sitemap: base + "/sitemap.xml",
    host: base,
  };
}
