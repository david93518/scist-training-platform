import { requireCap } from "@/server/auth";
import { route, json, readJson, noContent } from "@/server/http";
import { trackSchema } from "@/server/validators";
import { saveTrack, deleteTrack, findTrackAdmin } from "@/server/repo/content";
import { audit } from "@/server/repo/ops";
import { describeDelete, describeSave } from "@/lib/audit-diff";

export const PUT = route(async (req: Request, ctx: RouteContext<"/api/admin/tracks/[id]">) => {
  const user = await requireCap("content.write");
  const { id } = await ctx.params;
  const input = await readJson(req, trackSchema);
  if (input.id !== id) return json({ error: "id mismatch" }, { status: 400 });
  const before = await findTrackAdmin(id);
  const saved = await saveTrack(input);
  const { label, changes } = describeSave("track", before, saved);
  await audit(user.id, "save", "track", id, label, changes);
  return json(saved);
});

export const DELETE = route(async (req: Request, ctx: RouteContext<"/api/admin/tracks/[id]">) => {
  const user = await requireCap("track.delete");
  const { id } = await ctx.params;
  const before = await findTrackAdmin(id);
  const force = new URL(req.url).searchParams.get("force") === "1";
  await deleteTrack(id, force);
  await audit(user.id, "delete", "track", id, describeDelete(before, id));
  return noContent();
});
