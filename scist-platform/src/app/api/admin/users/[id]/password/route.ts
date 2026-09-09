import { adminSetPassword, requireRole } from "@/server/auth";
import { route, json, readJson } from "@/server/http";
import { adminPasswordSchema } from "@/server/validators";
import { audit } from "@/server/repo/ops";

export const POST = route(async (req: Request, ctx: RouteContext<"/api/admin/users/[id]/password">) => {
  const actor = await requireRole("admin");
  const { id } = await ctx.params;
  const input = await readJson(req, adminPasswordSchema);
  await adminSetPassword(actor, id, input.password);
  await audit(actor.id, "password", "user", id, "重設密碼");
  return json({ ok: true });
});
