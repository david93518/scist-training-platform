import { requireRole } from "@/server/auth";
import { route, json } from "@/server/http";
import { listEventsAdmin } from "@/server/repo/content";

export const GET = route(async () => {
  await requireRole("instructor");
  return json(await listEventsAdmin());
});
