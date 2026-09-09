import { requireRole } from "@/server/auth";
import { route, json, noContent, readJson } from "@/server/http";
import { userPatchSchema } from "@/server/validators";
import { getUserDetail, setUserRole, setUserBanned } from "@/server/repo/users";
import { audit } from "@/server/repo/ops";

export const GET = route(async (_req: Request, ctx: RouteContext<"/api/admin/users/[id]">) => {
  await requireRole("ta");
  const { id } = await ctx.params;
  return json(await getUserDetail(id));
});

export const PATCH = route(async (req: Request, ctx: RouteContext<"/api/admin/users/[id]">) => {
  const actor = await requireRole("admin");
  const { id } = await ctx.params;
  const input = await readJson(req, userPatchSchema);
  if (input.role) {
    await setUserRole(actor, id, input.role);
    await audit(actor.id, "role", "user", id, "角色改為 " + input.role);
  }
  if (typeof input.banned === "boolean") {
    await setUserBanned(actor, id, input.banned);
    await audit(actor.id, input.banned ? "ban" : "unban", "user", id, input.banned ? "停權" : "解除停權");
  }
  return noContent();
});
