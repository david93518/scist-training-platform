import { requireRole } from "@/server/auth";
import { route, json } from "@/server/http";
import { exportAll } from "@/server/repo/transfer";

export const GET = route(async () => {
  await requireRole("instructor");
  return json(await exportAll());
});
