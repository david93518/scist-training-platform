/**
 * Import from CTFd exports, export everything as JSON.
 *
 * CTFd's export is a zip of JSON tables; the relevant part is
 *   { "challenges": [{ name, category, value, description, flags: [{ content }], hints: [{ content, cost }] }] }
 * which is also what the console's import dialog expects.
 */
import { nanoid } from "nanoid";
import { eq } from "drizzle-orm";
import { getDb, schema } from "../db";
import { sha256Hex } from "@/lib/hash";
import { listTracksAdmin, listLessonsAdmin, listChallengesAdmin, listEventsAdmin } from "./content";
import { getSettings } from "./settings";

const CATEGORIES = ["web", "crypto", "reverse", "pwn", "linux", "misc"] as const;

export async function importCtfd(payload: unknown, actorId?: string) {
  const list = (payload as { challenges?: unknown[] })?.challenges;
  if (!Array.isArray(list)) throw new Error("需要 CTFd 匯出的 JSON（找不到 challenges 陣列）");
  const db = await getDb();
  let imported = 0;
  let skipped = 0;

  for (const raw of list as Record<string, unknown>[]) {
    const name = String(raw.name ?? "").trim();
    if (!name) {
      skipped++;
      continue;
    }
    const slug = name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "")
      .slice(0, 48);
    const exists = await db.query.challenges.findFirst({ where: eq(schema.challenges.slug, slug), columns: { id: true } });
    if (exists) {
      skipped++;
      continue;
    }
    const catRaw = String(raw.category ?? "misc").toLowerCase();
    const category = (CATEGORIES as readonly string[]).includes(catRaw) ? (catRaw as (typeof CATEGORIES)[number]) : "misc";
    const value = Number(raw.value ?? 100);
    const difficulty = value >= 800 ? "insane" : value >= 400 ? "hard" : value >= 200 ? "medium" : "easy";
    const id = nanoid(12);

    await db.insert(schema.challenges).values({
      id,
      slug,
      name,
      category,
      difficulty,
      kind: "challenge",
      blurb: "",
      description: String(raw.description ?? "").split(/\n{2,}|\r\n\r\n/).map((s) => s.trim()).filter(Boolean),
      tags: [],
      status: "draft",
      createdBy: actorId ?? null,
    });

    const flags = (raw.flags as { content?: string }[] | undefined) ?? [];
    for (const [i, f] of flags.entries()) {
      const content = String(f.content ?? "").trim();
      if (!content) continue;
      await db.insert(schema.challengeFlags).values({
        challengeId: id,
        flagId: i === 0 ? "flag" : "flag" + (i + 1),
        label: i === 0 ? "Flag" : "Flag " + (i + 1),
        sha256: await sha256Hex(content),
        points: i === 0 ? value : 0,
        sortOrder: i,
      });
    }
    const hints = (raw.hints as { content?: string; cost?: number }[] | undefined) ?? [];
    for (const [i, h] of hints.entries()) {
      await db.insert(schema.challengeHints).values({ challengeId: id, sortOrder: i, text: String(h.content ?? ""), cost: Number(h.cost ?? 10) });
    }
    imported++;
  }
  return { imported, skipped };
}

export async function exportAll() {
  const [tracks, lessons, challenges, events, settings] = await Promise.all([
    listTracksAdmin(),
    listLessonsAdmin(),
    listChallengesAdmin(),
    listEventsAdmin(),
    getSettings(),
  ]);
  return { exportedAt: new Date().toISOString(), tracks, lessons, challenges, events, settings };
}
