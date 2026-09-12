import type { MetadataRoute } from "next";
import { getTracksPublic } from "@/server/repo/content";
import { siteUrl } from "@/server/env";

/** Content lives in the database, so this is built per request, not at build. */
export const dynamic = "force-dynamic";

const STATIC_PATHS = ["", "/learn", "/challenges", "/leaderboard", "/community", "/about"];

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = siteUrl();
  const now = new Date();

  const entries: MetadataRoute.Sitemap = STATIC_PATHS.map((path) => ({
    url: base + (path || "/"),
    lastModified: now,
    changeFrequency: path === "" ? "daily" : "weekly",
    priority: path === "" ? 1 : 0.8,
  }));

  // Only publicly readable pages belong here. The lesson player and a
  // challenge's own page need an account (src/proxy.ts), so listing them would
  // just point crawlers at a redirect to the login dialog.
  try {
    const tracks = await getTracksPublic();
    for (const t of tracks) {
      entries.push({ url: base + "/learn/" + t.slug, lastModified: now, changeFrequency: "weekly", priority: 0.7 });
    }
  } catch (err) {
    console.error("[sitemap] content unavailable, serving static paths only:", err);
  }

  return entries;
}
