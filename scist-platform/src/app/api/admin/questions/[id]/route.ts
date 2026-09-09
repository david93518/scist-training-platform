import { requireRole } from "@/server/auth";
import { route, noContent, readJson } from "@/server/http";
import { questionPatchSchema } from "@/server/validators";
import { acceptAnswer, deleteQuestion } from "@/server/repo/community";
import { audit } from "@/server/repo/ops";

export const PATCH = route(async (req: Request, ctx: RouteContext<"/api/admin/questions/[id]">) => {
  const user = await requireRole("ta");
  const { id } = await ctx.params;
  const { acceptedAnswerId } = await readJson(req, questionPatchSchema);
  await acceptAnswer(id, acceptedAnswerId);
  await audit(user.id, "accept", "question", id, "採納回答 " + acceptedAnswerId);
  return noContent();
});

export const DELETE = route(async (_req: Request, ctx: RouteContext<"/api/admin/questions/[id]">) => {
  const user = await requireRole("instructor");
  const { id } = await ctx.params;
  await deleteQuestion(id);
  await audit(user.id, "delete", "question", id, id);
  return noContent();
});
