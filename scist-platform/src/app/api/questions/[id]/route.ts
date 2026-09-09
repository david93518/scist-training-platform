import { requireUser } from "@/server/auth";
import { route, noContent, readJson } from "@/server/http";
import { questionPatchSchema } from "@/server/validators";
import { acceptAnswer } from "@/server/repo/community";

/** Accept an answer. The asker may do this on their own thread; TAs on any. */
export const PATCH = route(async (req: Request, ctx: RouteContext<"/api/questions/[id]">) => {
  const user = await requireUser();
  const { id } = await ctx.params;
  const { acceptedAnswerId } = await readJson(req, questionPatchSchema);
  await acceptAnswer(id, acceptedAnswerId, { id: user.id, role: user.role });
  return noContent();
});
