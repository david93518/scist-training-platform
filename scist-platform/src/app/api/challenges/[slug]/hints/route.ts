import { requireUser } from "@/server/auth";
import { route, json, readJson } from "@/server/http";
import { hintUnlockSchema } from "@/server/validators";
import { unlockHint } from "@/server/repo/learner";

/** Unlock a hint; the cost is deducted from the ledger once. */
export const POST = route(async (req: Request, ctx: RouteContext<"/api/challenges/[slug]/hints">) => {
  const user = await requireUser();
  const { slug } = await ctx.params;
  const { hintId } = await readJson(req, hintUnlockSchema);
  return json(await unlockHint(user.id, slug, hintId));
});
