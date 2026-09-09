import { requireRole } from "@/server/auth";
import { route, json, readJson } from "@/server/http";
import { xpAdjustSchema } from "@/server/validators";
import { adjustXp } from "@/server/repo/users";
import { audit } from "@/server/repo/ops";

export const POST = route(async (req: Request, ctx: RouteContext<"/api/admin/users/[id]/xp">) => {
  const actor = await requireRole("admin");
  const { id } = await ctx.params;
  const input = await readJson(req, xpAdjustSchema);
  const xp = await adjustXp(actor, id, input.delta, input.reason);
  await audit(actor.id, "xp", "user", id, (input.delta > 0 ? "+" : "") + input.delta + " XP · " + input.reason);
  return json({ xp });
});
