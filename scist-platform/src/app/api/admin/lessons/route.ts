import { requireCap } from "@/server/auth";
import { route, json } from "@/server/http";
import { listLessonsAdmin } from "@/server/repo/content";

export const GET = route(async () => {
  await requireCap("content.read");
  return json(await listLessonsAdmin());
});
