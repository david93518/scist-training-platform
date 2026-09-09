import { requireUser } from "@/server/auth";
import { route, json, readJson } from "@/server/http";
import { voteSchema } from "@/server/validators";
import { voteAnswer, voteQuestion } from "@/server/repo/community";

/** Toggles the reader's vote. With `answerId` it votes that answer instead. */
export const POST = route(async (req: Request, ctx: RouteContext<"/api/questions/[id]/vote">) => {
  const user = await requireUser();
  const { id } = await ctx.params;
  const { on, answerId } = await readJson(req, voteSchema);
  return json(answerId ? await voteAnswer(user.id, answerId, on) : await voteQuestion(user.id, id, on));
});
