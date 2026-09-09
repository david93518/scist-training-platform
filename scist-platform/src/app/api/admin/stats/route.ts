import { requireRole } from "@/server/auth";
import { route, json } from "@/server/http";
import { getStats } from "@/server/repo/settings";

export const GET = route(async () => {
  await requireRole("instructor");
  return json(await getStats());
});
