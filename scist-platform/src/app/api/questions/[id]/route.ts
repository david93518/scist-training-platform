import { requireUser } from "@/server/auth";
import { route, noContent, readJson } from "@/server/http";
import { questionPatchSchema } from "@/server/validators";
import { acceptAnswer, deleteOwnQuestion, updateQuestion } from "@/server/repo/community";

/**
 * Two things share this handler: the asker (or a TA) marking / unmarking the
 * best answer, and the asker editing what they wrote.
 */
export const PATCH = route(async (req: Request, ctx: RouteContext<"/api/questions/[id]">) => {
  const user = await requireUser();
  const { id } = await ctx.params;
  const input = await readJson(req, questionPatchSchema);
  const actor = { id: user.id, role: user.role };

  if (input.title !== undefined || input.body !== undefined) {
    await updateQuestion(actor, id, { title: input.title, body: input.body });
  }
  if (input.acceptedAnswerId !== undefined) {
    await acceptAnswer(id, input.acceptedAnswerId, actor);
  }
  return noContent();
});

/** 作者只能在還沒有別人回覆時撤回；助教以上不受限 */
export const DELETE = route(async (_req: Request, ctx: RouteContext<"/api/questions/[id]">) => {
  const user = await requireUser();
  const { id } = await ctx.params;
  await deleteOwnQuestion({ id: user.id, role: user.role }, id);
  return noContent();
});
