import { requireRole } from "@/server/auth";
import { route, json, readJson, noContent } from "@/server/http";
import { instructorSchema } from "@/server/validators";
import { saveInstructor, deleteInstructor } from "@/server/repo/instructors";
import { audit } from "@/server/repo/ops";

export const PUT = route(async (req: Request, ctx: RouteContext<"/api/admin/instructors/[id]">) => {
  const user = await requireRole("instructor");
  const { id } = await ctx.params;
  const input = await readJson(req, instructorSchema);
  if (input.id !== id) return json({ error: "id mismatch" }, { status: 400 });
  const saved = await saveInstructor(input);
  await audit(user.id, "save", "instructor", id, saved.name);
  return json(saved);
});

export const DELETE = route(async (_req: Request, ctx: RouteContext<"/api/admin/instructors/[id]">) => {
  const user = await requireRole("admin");
  const { id } = await ctx.params;
  await deleteInstructor(id);
  await audit(user.id, "delete", "instructor", id, id);
  return noContent();
});
