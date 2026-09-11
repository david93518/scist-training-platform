import { requireCap } from "@/server/auth";
import { route, json, noContent, readJson } from "@/server/http";
import { userPatchSchema } from "@/server/validators";
import { getUserDetail, setUserRole, setUserBanned, findUserBasic } from "@/server/repo/users";
import { audit } from "@/server/repo/ops";
import { ROLE } from "@/lib/audit-diff";

export const GET = route(async (_req: Request, ctx: RouteContext<"/api/admin/users/[id]">) => {
  await requireCap("users.read");
  const { id } = await ctx.params;
  return json(await getUserDetail(id));
});

export const PATCH = route(async (req: Request, ctx: RouteContext<"/api/admin/users/[id]">) => {
  const actor = await requireCap("users.manage");
  const { id } = await ctx.params;
  const input = await readJson(req, userPatchSchema);
  const before = await findUserBasic(id);
  const who = before?.handle ?? id;
  if (input.role) {
    await setUserRole(actor, id, input.role);
    await audit(actor.id, "role", "user", id, who + " 的角色 " + ROLE(before?.role) + " → " + ROLE(input.role), [
      { field: "role", label: "角色", before: ROLE(before?.role), after: ROLE(input.role) },
    ]);
  }
  if (typeof input.banned === "boolean") {
    await setUserBanned(actor, id, input.banned);
    await audit(actor.id, input.banned ? "ban" : "unban", "user", id, who + (input.banned ? " 已停權" : " 已解除停權"));
  }
  return noContent();
});
