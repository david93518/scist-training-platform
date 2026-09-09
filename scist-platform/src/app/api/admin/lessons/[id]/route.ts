import { requireRole } from "@/server/auth";
import { route, json, readJson, noContent } from "@/server/http";
import { lessonSchema } from "@/server/validators";
import { saveLesson, deleteLesson } from "@/server/repo/content";
import { audit } from "@/server/repo/ops";

export const PUT = route(async (req: Request, ctx: RouteContext<"/api/admin/lessons/[id]">) => {
  const user = await requireRole("instructor");
  const { id } = await ctx.params;
  const input = await readJson(req, lessonSchema);
  if (input.id !== id) return json({ error: "id mismatch" }, { status: 400 });
  const saved = await saveLesson({ ...input, updatedAt: input.updatedAt ?? new Date().toISOString() }, user.id);
  await audit(user.id, "save", "lesson", id, saved.title);
  return json(saved);
});

export const DELETE = route(async (_req: Request, ctx: RouteContext<"/api/admin/lessons/[id]">) => {
  const user = await requireRole("instructor");
  const { id } = await ctx.params;
  await deleteLesson(id);
  await audit(user.id, "delete", "lesson", id, id);
  return noContent();
});
