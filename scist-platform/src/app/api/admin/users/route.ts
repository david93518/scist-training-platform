import { requireCap } from "@/server/auth";
import { route, json } from "@/server/http";
import { listUsersAdmin } from "@/server/repo/users";

export const GET = route(async () => {
  await requireCap("users.read");
  return json(await listUsersAdmin());
});
