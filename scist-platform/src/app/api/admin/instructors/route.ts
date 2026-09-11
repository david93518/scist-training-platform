import { requireCap } from "@/server/auth";
import { route, json } from "@/server/http";
import { listInstructorsAdmin } from "@/server/repo/instructors";

export const GET = route(async () => {
  await requireCap("content.read");
  return json(await listInstructorsAdmin());
});
