import { requireUser } from "@/server/auth";
import { route, json, readJson } from "@/server/http";
import { attemptSchema } from "@/server/validators";
import { attemptFlag } from "@/server/repo/learner";

/** Server-side flag check. Replaces lib/ctfd.ts attemptFlag once the client is wired. */
export const POST = route(async (req: Request, ctx: RouteContext<"/api/challenges/[slug]/attempt">) => {
  const user = await requireUser();
  const { slug } = await ctx.params;
  const { flag } = await readJson(req, attemptSchema);
  return json(await attemptFlag(user.id, slug, flag));
});
