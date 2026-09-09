import { eq } from "drizzle-orm";
import { requireRole } from "@/server/auth";
import { route, json, readJson } from "@/server/http";
import { uploadVideoSchema } from "@/server/validators";
import { createDirectUpload } from "@/server/services/stream";
import { getDb, schema } from "@/server/db";

/** Returns a one-time Cloudflare Stream upload URL (or a mock ticket). */
export const POST = route(async (req: Request) => {
  await requireRole("instructor");
  const input = await readJson(req, uploadVideoSchema);
  const ticket = await createDirectUpload({ name: input.name, lessonId: input.lessonId });
  const db = await getDb();
  await db
    .update(schema.lessons)
    .set({ videoProvider: "stream", videoId: ticket.uid, videoStatus: "uploading" })
    .where(eq(schema.lessons.id, input.lessonId));
  return json({ mode: ticket.mode, uploadUrl: ticket.uploadUrl, id: ticket.uid }, { status: 201 });
});
