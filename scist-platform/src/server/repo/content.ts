/**
 * Content repository — tracks, modules, lessons, challenges, events.
 *
 * Two families of functions:
 *   *Admin()  — full rows in the AdminXxx shapes the console edits
 *   *Public() — the exact shapes the public pages already consume
 *               (src/data/tracks Track, src/data/challenges Challenge …), so a
 *               page switches from mock data to the database by replacing one
 *               import with one await.
 */
import { and, asc, desc, eq, inArray, sql } from "drizzle-orm";
import { getDb, schema } from "../db";
import { sha256Hex } from "@/lib/hash";
import { deleteObject, publicUrl } from "../services/r2";
import type { AdminChallenge, AdminEvent, AdminLesson, AdminTrack } from "@/admin/types";
import type { Track as PublicTrack, Lesson as PublicLesson } from "@/data/tracks";
import type { Challenge as PublicChallenge } from "@/data/challenges";
import type { SciEvent as PublicEvent } from "@/data/events";

const iso = (d: Date | null | undefined) => (d ? d.toISOString() : null);

/* ================================ tracks ================================ */
export async function listTracksAdmin(): Promise<AdminTrack[]> {
  const db = await getDb();
  const rows = await db.query.tracks.findMany({
    with: { modules: { orderBy: asc(schema.modules.sortOrder) } },
    orderBy: asc(schema.tracks.sortOrder),
  });
  return rows.map((t) => ({
    id: t.id,
    slug: t.slug,
    name: t.name,
    en: t.en,
    tagline: t.tagline,
    icon: t.icon,
    color: t.color,
    level: t.level,
    difficulty: t.difficulty,
    outcome: t.outcome,
    syllabus: t.syllabus,
    instructorId: t.instructorId,
    sortOrder: t.sortOrder,
    status: t.status,
    modules: t.modules.map((m) => ({ id: m.id, title: m.title, sortOrder: m.sortOrder })),
  }));
}

export async function saveTrack(input: AdminTrack): Promise<AdminTrack> {
  const db = await getDb();
  const row = {
    id: input.id,
    slug: input.slug,
    name: input.name,
    en: input.en,
    tagline: input.tagline,
    icon: input.icon,
    color: input.color,
    level: input.level,
    difficulty: input.difficulty,
    outcome: input.outcome,
    syllabus: input.syllabus,
    instructorId: input.instructorId,
    sortOrder: input.sortOrder,
    status: input.status,
  };
  await db.insert(schema.tracks).values(row).onConflictDoUpdate({ target: schema.tracks.id, set: row });

  for (const [i, m] of input.modules.entries()) {
    const mrow = { id: m.id, trackId: input.id, title: m.title, sortOrder: i };
    await db.insert(schema.modules).values(mrow).onConflictDoUpdate({ target: schema.modules.id, set: mrow });
  }
  // remove modules that were dropped, but only if they hold no lessons
  const keep = input.modules.map((m) => m.id);
  const existing = await db.select({ id: schema.modules.id }).from(schema.modules).where(eq(schema.modules.trackId, input.id));
  for (const m of existing) {
    if (keep.includes(m.id)) continue;
    const [{ n }] = await db.select({ n: sql<number>`count(*)::int` }).from(schema.lessons).where(eq(schema.lessons.moduleId, m.id));
    if (Number(n) === 0) await db.delete(schema.modules).where(eq(schema.modules.id, m.id));
  }
  const [saved] = (await listTracksAdmin()).filter((t) => t.id === input.id);
  return saved;
}

export async function deleteTrack(id: string) {
  const db = await getDb();
  await db.delete(schema.tracks).where(eq(schema.tracks.id, id));
}

/* ================================ lessons =============================== */
function toAdminLesson(l: typeof schema.lessons.$inferSelect): AdminLesson {
  return {
    id: l.id,
    trackId: l.trackId,
    moduleId: l.moduleId,
    slug: l.slug,
    title: l.title,
    summary: l.summary,
    durationSec: l.durationSec,
    xp: l.xp,
    videoProvider: l.videoProvider,
    videoId: l.videoId,
    videoStatus: l.videoStatus,
    content: l.content,
    checkpoints: l.checkpoints,
    labSlug: l.labSlug,
    sortOrder: l.sortOrder,
    status: l.status,
    updatedAt: l.updatedAt.toISOString(),
  };
}

export async function listLessonsAdmin(): Promise<AdminLesson[]> {
  const db = await getDb();
  const rows = await db.select().from(schema.lessons).orderBy(asc(schema.lessons.sortOrder));
  return rows.map(toAdminLesson);
}

export async function saveLesson(input: AdminLesson, actorId?: string): Promise<AdminLesson> {
  const db = await getDb();
  const prev = await db.query.lessons.findFirst({ where: eq(schema.lessons.id, input.id) });
  const row = {
    id: input.id,
    trackId: input.trackId,
    moduleId: input.moduleId,
    slug: input.slug,
    title: input.title,
    summary: input.summary,
    durationSec: input.durationSec,
    xp: input.xp,
    videoProvider: input.videoProvider,
    videoId: input.videoId,
    videoStatus: input.videoStatus,
    content: input.content,
    checkpoints: input.checkpoints,
    labSlug: input.labSlug,
    sortOrder: input.sortOrder,
    status: input.status,
    publishedAt: input.status === "published" ? (prev?.publishedAt ?? new Date()) : prev?.publishedAt ?? null,
    createdBy: prev?.createdBy ?? actorId ?? null,
  };
  await db.insert(schema.lessons).values(row).onConflictDoUpdate({ target: schema.lessons.id, set: row });
  const saved = await db.query.lessons.findFirst({ where: eq(schema.lessons.id, input.id) });
  return toAdminLesson(saved!);
}

export async function deleteLesson(id: string) {
  const db = await getDb();
  await db.delete(schema.lessons).where(eq(schema.lessons.id, id));
}

export async function reorderLessons(moduleId: string, ids: string[]) {
  const db = await getDb();
  for (const [i, id] of ids.entries()) {
    await db.update(schema.lessons).set({ sortOrder: i }).where(and(eq(schema.lessons.id, id), eq(schema.lessons.moduleId, moduleId)));
  }
}

/* =============================== challenges ============================= */
type ChallengeRow = typeof schema.challenges.$inferSelect & {
  flags: (typeof schema.challengeFlags.$inferSelect)[];
  hints: (typeof schema.challengeHints.$inferSelect)[];
  files: (typeof schema.challengeFiles.$inferSelect)[];
};

function toAdminChallenge(c: ChallengeRow): AdminChallenge {
  return {
    id: c.id,
    slug: c.slug,
    name: c.name,
    category: c.category,
    difficulty: c.difficulty,
    kind: c.kind,
    blurb: c.blurb,
    description: c.description,
    tags: c.tags,
    authorId: c.authorId,
    tutorial: c.tutorial,
    lessonRef: c.lessonRef,
    connectionType: c.connectionType,
    connectionValue: c.connectionValue,
    instanceImage: c.instanceImage,
    instancePort: c.instancePort,
    instanceTtlMin: c.instanceTtlMin,
    baseSolves: c.baseSolves,
    rating: c.rating,
    status: c.status,
    releasedAt: iso(c.releasedAt),
    flags: [...c.flags].sort((a, b) => a.sortOrder - b.sortOrder).map((f) => ({ id: f.id, flagId: f.flagId, label: f.label, sha256: f.sha256, points: f.points })),
    hints: [...c.hints].sort((a, b) => a.sortOrder - b.sortOrder).map((h) => ({ id: h.id, text: h.text, cost: h.cost })),
    files: c.files.map((f) => ({ id: f.id, name: f.name, size: f.size, objectKey: f.objectKey, status: f.objectKey ? "ready" : "listed" })),
    updatedAt: c.updatedAt.toISOString(),
  };
}

export async function listChallengesAdmin(): Promise<AdminChallenge[]> {
  const db = await getDb();
  const rows = await db.query.challenges.findMany({ with: { flags: true, hints: true, files: true }, orderBy: desc(schema.challenges.releasedAt) });
  return rows.map(toAdminChallenge);
}

/**
 * R2 keeps charging for objects nobody links to, so removing an attachment in
 * the editor has to remove the object too. A key still referenced by another
 * row is left alone; a failed delete only logs, since the row is already gone.
 */
async function dropOrphanedObjects(before: { objectKey: string | null }[], after: { objectKey: string | null }[]) {
  const kept = new Set(after.map((f) => f.objectKey).filter((k): k is string => Boolean(k)));
  const gone = [...new Set(before.map((f) => f.objectKey).filter((k): k is string => Boolean(k)))].filter((k) => !kept.has(k));
  for (const key of gone) {
    await deleteObject(key).catch((err) => console.error("[r2] could not delete " + key, err));
  }
}

export async function saveChallenge(input: AdminChallenge, actorId?: string): Promise<AdminChallenge> {
  const db = await getDb();
  const prev = await db.query.challenges.findFirst({ where: eq(schema.challenges.id, input.id) });
  const row = {
    id: input.id,
    slug: input.slug,
    name: input.name,
    category: input.category,
    difficulty: input.difficulty,
    kind: input.kind,
    blurb: input.blurb,
    description: input.description,
    tags: input.tags,
    authorId: input.authorId,
    tutorial: input.tutorial,
    lessonRef: input.lessonRef,
    connectionType: input.connectionType,
    connectionValue: input.connectionValue,
    instanceImage: input.instanceImage,
    instancePort: input.instancePort,
    instanceTtlMin: input.instanceTtlMin,
    baseSolves: input.baseSolves,
    rating: input.rating,
    status: input.status,
    releasedAt: input.releasedAt ? new Date(input.releasedAt) : null,
    createdBy: prev?.createdBy ?? actorId ?? null,
  };
  await db.insert(schema.challenges).values(row).onConflictDoUpdate({ target: schema.challenges.id, set: row });

  // flags: plaintext (if sent) is hashed here and never stored
  const flagIds: string[] = [];
  for (const [i, f] of input.flags.entries()) {
    const sha = f.plaintext && f.plaintext.trim() ? await sha256Hex(f.plaintext.trim()) : f.sha256;
    if (!sha) throw new Error("flag " + f.label + " has no value");
    const frow = { id: f.id, challengeId: input.id, flagId: f.flagId, label: f.label, sha256: sha, points: f.points, sortOrder: i };
    await db.insert(schema.challengeFlags).values(frow).onConflictDoUpdate({ target: schema.challengeFlags.id, set: frow });
    flagIds.push(f.id);
  }
  await db.delete(schema.challengeFlags).where(and(eq(schema.challengeFlags.challengeId, input.id), flagIds.length ? sql`${schema.challengeFlags.id} not in ${flagIds}` : sql`true`));

  const hintIds: string[] = [];
  for (const [i, h] of input.hints.entries()) {
    const hrow = { id: h.id, challengeId: input.id, sortOrder: i, text: h.text, cost: h.cost };
    await db.insert(schema.challengeHints).values(hrow).onConflictDoUpdate({ target: schema.challengeHints.id, set: hrow });
    hintIds.push(h.id);
  }
  await db.delete(schema.challengeHints).where(and(eq(schema.challengeHints.challengeId, input.id), hintIds.length ? sql`${schema.challengeHints.id} not in ${hintIds}` : sql`true`));

  const before = await db.query.challengeFiles.findMany({ where: eq(schema.challengeFiles.challengeId, input.id) });
  const fileIds: string[] = [];
  for (const f of input.files) {
    const frow = { id: f.id, challengeId: input.id, name: f.name, objectKey: f.objectKey, size: f.size, contentType: null as string | null };
    await db.insert(schema.challengeFiles).values(frow).onConflictDoUpdate({ target: schema.challengeFiles.id, set: frow });
    fileIds.push(f.id);
  }
  await db.delete(schema.challengeFiles).where(and(eq(schema.challengeFiles.challengeId, input.id), fileIds.length ? sql`${schema.challengeFiles.id} not in ${fileIds}` : sql`true`));
  await dropOrphanedObjects(before, input.files);

  const saved = await db.query.challenges.findFirst({ where: eq(schema.challenges.id, input.id), with: { flags: true, hints: true, files: true } });
  return toAdminChallenge(saved!);
}

export async function deleteChallenge(id: string) {
  const db = await getDb();
  const files = await db.query.challengeFiles.findMany({ where: eq(schema.challengeFiles.challengeId, id) });
  await db.delete(schema.challenges).where(eq(schema.challenges.id, id));
  await dropOrphanedObjects(files, []);
}

/* ================================ events ================================ */
function toAdminEvent(e: typeof schema.events.$inferSelect): AdminEvent {
  return {
    id: e.id,
    type: e.type,
    title: e.title,
    summary: e.summary,
    startsAt: e.startsAt.toISOString(),
    durationMin: e.durationMin,
    mode: e.mode,
    location: e.location,
    hostId: e.hostId,
    capacity: e.capacity,
    baseRegistered: e.baseRegistered,
    tags: e.tags,
    status: e.status,
  };
}

export async function listEventsAdmin(): Promise<AdminEvent[]> {
  const db = await getDb();
  const rows = await db.select().from(schema.events).orderBy(asc(schema.events.startsAt));
  return rows.map(toAdminEvent);
}

export async function saveEvent(input: AdminEvent): Promise<AdminEvent> {
  const db = await getDb();
  const row = { ...input, startsAt: new Date(input.startsAt) };
  await db.insert(schema.events).values(row).onConflictDoUpdate({ target: schema.events.id, set: row });
  const [saved] = await db.select().from(schema.events).where(eq(schema.events.id, input.id));
  return toAdminEvent(saved);
}

export async function deleteEvent(id: string) {
  const db = await getDb();
  await db.delete(schema.events).where(eq(schema.events.id, id));
}

/* ============================ public shapes ============================= */
export async function getTracksPublic(): Promise<PublicTrack[]> {
  const db = await getDb();
  const rows = await db.query.tracks.findMany({
    where: eq(schema.tracks.status, "published"),
    with: {
      modules: { orderBy: asc(schema.modules.sortOrder) },
      lessons: { where: eq(schema.lessons.status, "published"), orderBy: asc(schema.lessons.sortOrder) },
    },
    orderBy: asc(schema.tracks.sortOrder),
  });
  return rows.map((t) => ({
    id: t.id,
    slug: t.slug,
    name: t.name,
    en: t.en,
    tagline: t.tagline,
    icon: t.icon,
    color: t.color,
    level: t.level as PublicTrack["level"],
    difficulty: t.difficulty,
    outcome: t.outcome,
    syllabus: t.syllabus,
    instructorId: t.instructorId ?? "",
    modules: t.modules.map((m) => ({
      title: m.title,
      lessons: t.lessons
        .filter((l) => l.moduleId === m.id)
        .map<PublicLesson>((l) => ({
          id: l.id,
          slug: l.slug,
          title: l.title,
          durationSec: l.durationSec,
          summary: l.summary,
          content: l.content,
          checkpoints: l.checkpoints,
          labSlug: l.labSlug ?? undefined,
          xp: l.xp,
        })),
    })),
  }));
}

/** Video source for the player: provider + id, plus playback URL when known. */
export async function getLessonVideo(lessonId: string) {
  const db = await getDb();
  const l = await db.query.lessons.findFirst({ where: eq(schema.lessons.id, lessonId), columns: { videoProvider: true, videoId: true, videoStatus: true } });
  return l ?? null;
}

export async function getChallengesPublic(): Promise<PublicChallenge[]> {
  const db = await getDb();
  const rows = await db.query.challenges.findMany({
    where: and(eq(schema.challenges.status, "published"), sql`${schema.challenges.releasedAt} is null or ${schema.challenges.releasedAt} <= now()`),
    with: { flags: true, hints: true, files: true },
    orderBy: desc(schema.challenges.releasedAt),
  });
  if (rows.length === 0) return [];
  const ids = rows.map((r) => r.id);
  const counts = await db
    .select({ challengeId: schema.solves.challengeId, n: sql<number>`count(distinct ${schema.solves.userId})::int` })
    .from(schema.solves)
    .where(inArray(schema.solves.challengeId, ids))
    .groupBy(schema.solves.challengeId);
  const firsts = await db
    .select({ challengeId: schema.solves.challengeId, userId: schema.solves.userId, solvedAt: sql<Date>`min(${schema.solves.solvedAt})` })
    .from(schema.solves)
    .where(inArray(schema.solves.challengeId, ids))
    .groupBy(schema.solves.challengeId, schema.solves.userId);
  const userIds = [...new Set(firsts.map((f) => f.userId))];
  const users = userIds.length ? await db.query.users.findMany({ where: inArray(schema.users.id, userIds), with: { school: true } }) : [];

  return rows.map((c) => {
    const solveCount = counts.find((x) => x.challengeId === c.id)?.n ?? 0;
    const fb = firsts.filter((f) => f.challengeId === c.id).sort((a, b) => new Date(a.solvedAt).getTime() - new Date(b.solvedAt).getTime())[0];
    const fbUser = fb ? users.find((u) => u.id === fb.userId) : undefined;
    return {
      id: c.id,
      slug: c.slug,
      name: c.name,
      category: c.category,
      difficulty: c.difficulty,
      kind: c.kind,
      blurb: c.blurb,
      description: c.description,
      hints: [...c.hints].sort((a, b) => a.sortOrder - b.sortOrder).map((h) => ({ id: h.id, text: h.text, cost: h.cost })),
      flags: [...c.flags].sort((a, b) => a.sortOrder - b.sortOrder).map((f) => ({ id: f.flagId, label: f.label, sha256: f.sha256, points: f.points })),
      points: c.flags.reduce((n, f) => n + f.points, 0),
      solves: c.baseSolves + Number(solveCount),
      rating: c.rating,
      authorId: c.authorId ?? "",
      tags: c.tags,
      releasedAt: (c.releasedAt ?? c.createdAt).toISOString(),
      firstBlood: fbUser ? { handle: fbUser.handle, school: fbUser.school?.short ?? "", time: new Date(fb!.solvedAt).toISOString() } : undefined,
      connection: c.connectionType !== "none" && c.connectionValue ? { type: c.connectionType, value: c.connectionValue } : undefined,
      files: c.files.map((f) => f.name),
      fileUrls: Object.fromEntries(c.files.filter((f) => f.objectKey).map((f) => [f.name, publicUrl(f.objectKey!)])),
      tutorial: c.tutorial || undefined,
      lesson: c.lessonRef ?? undefined,
    } as PublicChallenge & { fileUrls: Record<string, string | null> };
  });
}

export async function getEventsPublic(): Promise<PublicEvent[]> {
  const db = await getDb();
  const rows = await db.query.events.findMany({ where: eq(schema.events.status, "published"), with: { registrations: true }, orderBy: asc(schema.events.startsAt) });
  return rows.map((e) => ({
    id: e.id,
    type: e.type,
    title: e.title,
    summary: e.summary,
    startsAt: e.startsAt.toISOString(),
    durationMin: e.durationMin,
    mode: e.mode === "online" ? "線上" : "線下",
    location: e.location,
    hostId: e.hostId ?? "",
    capacity: e.capacity,
    registered: e.baseRegistered + e.registrations.length,
    tags: e.tags,
  }));
}
