import { requireCap } from "@/server/auth";
import { route, json } from "@/server/http";
import { listQuestionsAdmin } from "@/server/repo/community";

export const GET = route(async () => {
  await requireCap("questions.read");
  return json(await listQuestionsAdmin());
});
