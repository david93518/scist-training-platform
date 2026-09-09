import { eq } from "drizzle-orm";
import { requireRole } from "@/server/auth";
import { route, json } from "@/server/http";
import { getVideoStatus } from "@/server/services/stream";
import { getDb, schema } from "@/server/db";

/** Poll Cloudflare for encoding status and persist it on the lesson. */
export const GET = route(async (_req: Request, ctx: RouteContext<"/api/admin/uploads/video/[id]">) => {
  await requireRole("instructor");
  const { id } = await ctx.params;
  const status = await getVideoStatus(id);
  const db = await getDb();
  await db.update(schema.lessons).set({ videoStatus: status }).where(eq(schema.lessons.videoId, id));
  return json({ id, status });
});
