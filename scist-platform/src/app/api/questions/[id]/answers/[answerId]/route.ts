import { requireUser } from "@/server/auth";
import { route, noContent, readJson } from "@/server/http";
import { answerPatchSchema } from "@/server/validators";
import { deleteAnswer, updateAnswer } from "@/server/repo/community";

export const PATCH = route(async (req: Request, ctx: RouteContext<"/api/questions/[id]/answers/[answerId]">) => {
  const user = await requireUser();
  const { answerId } = await ctx.params;
  const { body } = await readJson(req, answerPatchSchema);
  await updateAnswer({ id: user.id, role: user.role }, answerId, body);
  return noContent();
});

/** 自己的回覆隨時能刪；助教以上可以刪任何一則 */
export const DELETE = route(async (_req: Request, ctx: RouteContext<"/api/questions/[id]/answers/[answerId]">) => {
  const user = await requireUser();
  const { answerId } = await ctx.params;
  await deleteAnswer({ id: user.id, role: user.role }, answerId);
  return noContent();
});
