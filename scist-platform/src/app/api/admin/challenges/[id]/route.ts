import { requireCap } from "@/server/auth";
import { route, json, readJson, noContent } from "@/server/http";
import { challengeSchema } from "@/server/validators";
import { saveChallenge, deleteChallenge, findChallengeAdmin } from "@/server/repo/content";
import { audit } from "@/server/repo/ops";
import { describeDelete, describeSave } from "@/lib/audit-diff";

export const PUT = route(async (req: Request, ctx: RouteContext<"/api/admin/challenges/[id]">) => {
  const user = await requireCap("content.write");
  const { id } = await ctx.params;
  const input = await readJson(req, challengeSchema);
  if (input.id !== id) return json({ error: "id mismatch" }, { status: 400 });
  const before = await findChallengeAdmin(id);
  const saved = await saveChallenge({ ...input, updatedAt: input.updatedAt ?? new Date().toISOString() }, user.id);
  const { label, changes } = describeSave("challenge", before, saved);
  await audit(user.id, "save", "challenge", id, label, changes);
  return json(saved);
});

export const DELETE = route(async (req: Request, ctx: RouteContext<"/api/admin/challenges/[id]">) => {
  const user = await requireCap("content.delete");
  const { id } = await ctx.params;
  const before = await findChallengeAdmin(id);
  const force = new URL(req.url).searchParams.get("force") === "1";
  await deleteChallenge(id, force);
  await audit(user.id, "delete", "challenge", id, describeDelete(before, id));
  return noContent();
});
