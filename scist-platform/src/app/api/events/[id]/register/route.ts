import { requireUser } from "@/server/auth";
import { route, json, readJson } from "@/server/http";
import { registerSchema } from "@/server/validators";
import { setEventRegistration } from "@/server/repo/learner";

export const POST = route(async (req: Request, ctx: RouteContext<"/api/events/[id]/register">) => {
  const user = await requireUser();
  const { id } = await ctx.params;
  const { on } = await readJson(req, registerSchema);
  return json(await setEventRegistration(user.id, id, on));
});
