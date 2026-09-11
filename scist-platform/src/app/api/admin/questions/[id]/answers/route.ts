import { requireCap } from "@/server/auth";
import { route, json, readJson } from "@/server/http";
import { answerCreateSchema } from "@/server/validators";
import { createAnswer } from "@/server/repo/community";

export const POST = route(async (req: Request, ctx: RouteContext<"/api/admin/questions/[id]/answers">) => {
  const user = await requireCap("questions.answer");
  const { id } = await ctx.params;
  const { body } = await readJson(req, answerCreateSchema);
  return json(await createAnswer({ id: user.id, handle: user.handle, role: user.role }, id, body, { fromAdmin: true }), { status: 201 });
});
