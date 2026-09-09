import { route, json } from "@/server/http";
import { leaderboard } from "@/server/repo/learner";
import { getSettings } from "@/server/repo/settings";

/** ?scope=weekly|alltime|schools */
export const GET = route(async (req: Request) => {
  const scope = new URL(req.url).searchParams.get("scope");
  const s = scope === "alltime" || scope === "schools" ? scope : "weekly";
  const settings = await getSettings();
  return json({ scope: s, entries: await leaderboard(s, settings.leaderboard.weekStartsOn) });
});
