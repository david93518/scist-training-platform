import { requireCap } from "@/server/auth";
import { route, json } from "@/server/http";
import { getStats } from "@/server/repo/settings";

export const GET = route(async () => {
  await requireCap("overview.read");
  return json(await getStats());
});
