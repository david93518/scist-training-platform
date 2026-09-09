import { requireRole } from "@/server/auth";
import { route, json } from "@/server/http";
import { listInstructorsAdmin } from "@/server/repo/instructors";

export const GET = route(async () => {
  await requireRole("ta");
  return json(await listInstructorsAdmin());
});
