import { eq } from "drizzle-orm";
import { nanoid } from "nanoid";
import { requireCap } from "@/server/auth";
import { route, json, readJson } from "@/server/http";
import { uploadFileSchema } from "@/server/validators";
import { presignPut, objectKeyFor } from "@/server/services/r2";
import { getDb, schema } from "@/server/db";

/** Returns a presigned PUT for R2 (or a mock ticket) and records the file row. */
export const POST = route(async (req: Request) => {
  await requireCap("content.write");
  const input = await readJson(req, uploadFileSchema);
  const db = await getDb();
  const ch = await db.query.challenges.findFirst({ where: eq(schema.challenges.id, input.challengeId), columns: { slug: true } });
  if (!ch) return json({ error: "challenge not found" }, { status: 404 });
  const objectKey = objectKeyFor(ch.slug, input.name);
  const ticket = await presignPut(objectKey, input.type);
  const id = nanoid(12);
  await db.insert(schema.challengeFiles).values({ id, challengeId: input.challengeId, name: input.name, objectKey, size: input.size, contentType: input.type });
  return json({ mode: ticket.mode, uploadUrl: ticket.uploadUrl, id, objectKey }, { status: 201 });
});
