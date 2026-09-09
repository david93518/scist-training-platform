import { requireRole } from "@/server/auth";
import { route, json } from "@/server/http";
import { listChallengesAdmin } from "@/server/repo/content";

export const GET = route(async () => {
  await requireRole("instructor");
  return json(await listChallengesAdmin());
});
