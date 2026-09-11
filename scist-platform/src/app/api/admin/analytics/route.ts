import { requireCap } from "@/server/auth";
import { route, json } from "@/server/http";
import { getAnalytics } from "@/server/repo/ops";

export const GET = route(async () => {
  await requireCap("analytics.read");
  return json(await getAnalytics());
});
