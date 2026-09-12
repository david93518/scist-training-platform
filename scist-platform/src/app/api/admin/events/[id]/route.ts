import { requireCap } from "@/server/auth";
import { route, json, readJson, noContent } from "@/server/http";
import { eventSchema } from "@/server/validators";
import { saveEvent, deleteEvent, findEventAdmin } from "@/server/repo/content";
import { audit } from "@/server/repo/ops";
import { describeDelete, describeSave } from "@/lib/audit-diff";

export const PUT = route(async (req: Request, ctx: RouteContext<"/api/admin/events/[id]">) => {
  const user = await requireCap("content.write");
  const { id } = await ctx.params;
  const input = await readJson(req, eventSchema);
  if (input.id !== id) return json({ error: "id mismatch" }, { status: 400 });
  const before = await findEventAdmin(id);
  const saved = await saveEvent(input);
  const { label, changes } = describeSave("event", before, saved);
  await audit(user.id, "save", "event", id, label, changes);
  return json(saved);
});

export const DELETE = route(async (_req: Request, ctx: RouteContext<"/api/admin/events/[id]">) => {
  const user = await requireCap("content.delete");
  const { id } = await ctx.params;
  const before = await findEventAdmin(id);
  await deleteEvent(id);
  await audit(user.id, "delete", "event", id, describeDelete(before, id));
  return noContent();
});
