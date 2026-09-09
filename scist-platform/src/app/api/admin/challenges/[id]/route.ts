import { requireRole } from "@/server/auth";
import { route, json, readJson, noContent } from "@/server/http";
import { challengeSchema } from "@/server/validators";
import { saveChallenge, deleteChallenge } from "@/server/repo/content";
import { audit } from "@/server/repo/ops";

export const PUT = route(async (req: Request, ctx: RouteContext<"/api/admin/challenges/[id]">) => {
  const user = await requireRole("instructor");
  const { id } = await ctx.params;
  const input = await readJson(req, challengeSchema);
  if (input.id !== id) return json({ error: "id mismatch" }, { status: 400 });
  const saved = await saveChallenge({ ...input, updatedAt: input.updatedAt ?? new Date().toISOString() }, user.id);
  await audit(user.id, "save", "challenge", id, saved.name);
  return json(saved);
});

export const DELETE = route(async (_req: Request, ctx: RouteContext<"/api/admin/challenges/[id]">) => {
  const user = await requireRole("instructor");
  const { id } = await ctx.params;
  await deleteChallenge(id);
  await audit(user.id, "delete", "challenge", id, id);
  return noContent();
});
