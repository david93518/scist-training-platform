import { requireUser } from "@/server/auth";
import { route, json } from "@/server/http";
import { unlockHint } from "@/server/repo/learner";

/** Unlock a hint; the cost is deducted from the ledger once. */
export const POST = route(async (_req: Request, ctx: RouteContext<"/api/challenges/[slug]/hints/[hintId]">) => {
  const user = await requireUser();
  const { slug, hintId } = await ctx.params;
  return json(await unlockHint(user.id, slug, hintId));
});
