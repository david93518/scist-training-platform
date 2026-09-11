import { requireCap } from "@/server/auth";
import { route, noContent, readJson } from "@/server/http";
import { questionPatchSchema } from "@/server/validators";
import { acceptAnswer, deleteQuestion } from "@/server/repo/community";
import { audit } from "@/server/repo/ops";

export const PATCH = route(async (req: Request, ctx: RouteContext<"/api/admin/questions/[id]">) => {
  const user = await requireCap("questions.answer");
  const { id } = await ctx.params;
  const { acceptedAnswerId = null } = await readJson(req, questionPatchSchema);
  await acceptAnswer(id, acceptedAnswerId);
  await audit(user.id, "accept", "question", id, acceptedAnswerId ? "採納回答 " + acceptedAnswerId : "取消最佳解答");
  return noContent();
});

export const DELETE = route(async (_req: Request, ctx: RouteContext<"/api/admin/questions/[id]">) => {
  const user = await requireCap("questions.delete");
  const { id } = await ctx.params;
  await deleteQuestion(id);
  await audit(user.id, "delete", "question", id, id);
  return noContent();
});
