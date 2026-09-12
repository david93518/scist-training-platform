import { requireCap } from "@/server/auth";
import { route, json, readJson, noContent } from "@/server/http";
import { instructorSchema } from "@/server/validators";
import { saveInstructor, deleteInstructor, findInstructorAdmin } from "@/server/repo/instructors";
import { audit } from "@/server/repo/ops";
import { describeDelete, describeSave } from "@/lib/audit-diff";

export const PUT = route(async (req: Request, ctx: RouteContext<"/api/admin/instructors/[id]">) => {
  const user = await requireCap("content.write");
  const { id } = await ctx.params;
  const input = await readJson(req, instructorSchema);
  if (input.id !== id) return json({ error: "id mismatch" }, { status: 400 });
  const before = await findInstructorAdmin(id);
  const saved = await saveInstructor(input);
  const { label, changes } = describeSave("instructor", before, saved);
  await audit(user.id, "save", "instructor", id, label, changes);
  return json(saved);
});

export const DELETE = route(async (_req: Request, ctx: RouteContext<"/api/admin/instructors/[id]">) => {
  const user = await requireCap("instructor.delete");
  const { id } = await ctx.params;
  const before = await findInstructorAdmin(id);
  await deleteInstructor(id);
  await audit(user.id, "delete", "instructor", id, describeDelete(before, id));
  return noContent();
});
