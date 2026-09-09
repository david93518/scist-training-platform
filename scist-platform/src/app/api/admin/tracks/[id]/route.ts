import { requireRole } from "@/server/auth";
import { route, json, readJson, noContent } from "@/server/http";
import { trackSchema } from "@/server/validators";
import { saveTrack, deleteTrack } from "@/server/repo/content";
import { audit } from "@/server/repo/ops";

export const PUT = route(async (req: Request, ctx: RouteContext<"/api/admin/tracks/[id]">) => {
  const user = await requireRole("instructor");
  const { id } = await ctx.params;
  const input = await readJson(req, trackSchema);
  if (input.id !== id) return json({ error: "id mismatch" }, { status: 400 });
  const saved = await saveTrack(input);
  await audit(user.id, "save", "track", id, saved.name);
  return json(saved);
});

export const DELETE = route(async (_req: Request, ctx: RouteContext<"/api/admin/tracks/[id]">) => {
  const user = await requireRole("admin");
  const { id } = await ctx.params;
  await deleteTrack(id);
  await audit(user.id, "delete", "track", id, id);
  return noContent();
});
