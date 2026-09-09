import { requireRole } from "@/server/auth";
import { route, json } from "@/server/http";
import { listQuestionsAdmin } from "@/server/repo/community";

export const GET = route(async () => {
  await requireRole("instructor");
  return json(await listQuestionsAdmin());
});
