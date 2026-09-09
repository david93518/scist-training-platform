import { requireRole } from "@/server/auth";
import { route, json } from "@/server/http";
import { getAnalytics } from "@/server/repo/ops";

export const GET = route(async () => {
  await requireRole("ta");
  return json(await getAnalytics());
});
