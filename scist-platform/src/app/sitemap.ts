import type { MetadataRoute } from "next";
import { allLessons } from "@/data/tracks";
import { getChallengesPublic, getTracksPublic } from "@/server/repo/content";
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

  // a database that is down must not turn the sitemap into a 500
  try {
    const [tracks, challenges] = await Promise.all([getTracksPublic(), getChallengesPublic()]);

    for (const t of tracks) {
      entries.push({ url: base + "/learn/" + t.slug, lastModified: now, changeFrequency: "weekly", priority: 0.7 });
      for (const l of allLessons(t)) {
        entries.push({ url: base + "/learn/" + t.slug + "/" + l.slug, lastModified: now, changeFrequency: "monthly", priority: 0.6 });
      }
    }
    for (const c of challenges) {
      entries.push({ url: base + "/challenges/" + c.slug, lastModified: now, changeFrequency: "monthly", priority: 0.6 });
    }
  } catch (err) {
    console.error("[sitemap] content unavailable, serving static paths only:", err);
  }

  return entries;
}
