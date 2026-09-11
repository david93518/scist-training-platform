import { requireUser } from "@/server/auth";
import { route, json, readJson } from "@/server/http";
import { hintUnlockSchema } from "@/server/validators";
import { listUnlockedHints, unlockHint } from "@/server/repo/learner";

/** Text of the hints this learner has already unlocked on the challenge. */
export const GET = route(async (_req: Request, ctx: RouteContext<"/api/challenges/[slug]/hints">) => {
  const user = await requireUser();
  const { slug } = await ctx.params;
  return json(await listUnlockedHints(user.id, slug));
});

/** Unlock a hint; the cost is deducted from the ledger once. */
export const POST = route(async (req: Request, ctx: RouteContext<"/api/challenges/[slug]/hints">) => {
  const user = await requireUser();
  const { slug } = await ctx.params;
  const { hintId } = await readJson(req, hintUnlockSchema);
  return json(await unlockHint(user.id, slug, hintId));
});
