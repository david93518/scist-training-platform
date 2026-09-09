import { requireRole } from "@/server/auth";
import { route, json } from "@/server/http";
import { listUsersAdmin } from "@/server/repo/users";

export const GET = route(async () => {
  await requireRole("instructor");
  return json(await listUsersAdmin());
});
