import { requireRole } from "@/server/auth";
import { route, noContent } from "@/server/http";
import { audit, killInstanceAdmin } from "@/server/repo/ops";

export const DELETE = route(async (_req: Request, ctx: RouteContext<"/api/admin/instances/[id]">) => {
  const user = await requireRole("ta");
  const { id } = await ctx.params;
  const label = await killInstanceAdmin(id);
  await audit(user.id, "kill", "instance", id, label);
  return noContent();
});
