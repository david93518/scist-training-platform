import { requireUser } from "@/server/auth";
import { route, json } from "@/server/http";
import { spawnInstance, killInstance } from "@/server/repo/learner";

export const POST = route(async (_req: Request, ctx: RouteContext<"/api/challenges/[slug]/instance">) => {
  const user = await requireUser();
  const { slug } = await ctx.params;
  return json(await spawnInstance(user.id, slug), { status: 201 });
});

export const DELETE = route(async (_req: Request, ctx: RouteContext<"/api/challenges/[slug]/instance">) => {
  const user = await requireUser();
  const { slug } = await ctx.params;
  return json(await killInstance(user.id, slug));
});
