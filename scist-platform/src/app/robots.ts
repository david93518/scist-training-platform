import type { MetadataRoute } from "next";
import { siteUrl } from "@/server/env";

export default function robots(): MetadataRoute.Robots {
  const base = siteUrl();
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      // the console and the API have nothing to index, and /api leaks nothing useful
      disallow: ["/admin", "/admin/", "/api/"],
    },
    sitemap: base + "/sitemap.xml",
    host: base,
  };
}
