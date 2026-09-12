import { requireCap } from "@/server/auth";
import { route, json, readJson, noContent } from "@/server/http";
import { lessonSchema } from "@/server/validators";
import { saveLesson, deleteLesson, findLessonAdmin } from "@/server/repo/content";
import { audit } from "@/server/repo/ops";
import { describeDelete, describeSave } from "@/lib/audit-diff";

export const PUT = route(async (req: Request, ctx: RouteContext<"/api/admin/lessons/[id]">) => {
  const user = await requireCap("content.write");
  const { id } = await ctx.params;
  const input = await readJson(req, lessonSchema);
  if (input.id !== id) return json({ error: "id mismatch" }, { status: 400 });
  const before = await findLessonAdmin(id);
  const saved = await saveLesson({ ...input, updatedAt: input.updatedAt ?? new Date().toISOString() }, user.id);
  const { label, changes } = describeSave("lesson", before, saved);
  await audit(user.id, "save", "lesson", id, label, changes);
  return json(saved);
});

export const DELETE = route(async (req: Request, ctx: RouteContext<"/api/admin/lessons/[id]">) => {
  const user = await requireCap("content.delete");
  const { id } = await ctx.params;
  const before = await findLessonAdmin(id);
  const force = new URL(req.url).searchParams.get("force") === "1";
  await deleteLesson(id, force);
  await audit(user.id, "delete", "lesson", id, describeDelete(before, id));
  return noContent();
});
