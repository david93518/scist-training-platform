/**
 * Learner repository — everything a logged-in student changes: progress,
 * checkpoint answers, solves, hints, XP ledger, event registrations,
 * challenge instances. The leaderboard is computed from the ledger.
 */
import { and, desc, eq, gt, gte, sql } from "drizzle-orm";
import { getDb, schema } from "../db";
import { sha256Hex, normalizeFlag } from "@/lib/hash";
import { ApiError } from "../auth";
import * as instancer from "../services/instancer";
import { notifyDiscord, firstBloodMessage } from "../services/discord";
import { getSettings } from "./settings";
import { expireInstances } from "./ops";
import { env } from "../env";
import { weekStart } from "@/lib/timezone";

/* ------------------------------ XP ------------------------------ */
export async function xpOf(userId: string) {
  const db = await getDb();
  const [row] = await db.select({ xp: sql<number>`coalesce(sum(${schema.xpLedger.delta}),0)::int` }).from(schema.xpLedger).where(eq(schema.xpLedger.userId, userId));
  return Number(row?.xp ?? 0);
}

async function ledger(userId: string, delta: number, reason: typeof schema.xpReason.enumValues[number], refId: string, label: string) {
  const db = await getDb();
  await db.insert(schema.xpLedger).values({ userId, delta, reason, refId, label });
}

/* ------------------------------ profile ------------------------------ */
/** Mirrors the shape of the client progress store so it can be hydrated directly. */
export async function getProfile(userId: string) {
  const db = await getDb();
  await expireInstances();
  const user = await db.query.users.findFirst({ where: eq(schema.users.id, userId), with: { school: true } });
  if (!user) throw new ApiError(404, "user not found");

  const progress = await db.query.lessonProgress.findMany({ where: eq(schema.lessonProgress.userId, userId) });
  const lessons = progress.length
    ? await db.query.lessons.findMany({ with: { track: { columns: { slug: true } } }, columns: { id: true, slug: true } })
    : [];
  const keyOf = (lessonId: string) => {
    const l = lessons.find((x) => x.id === lessonId);
    return l ? l.track.slug + "/" + l.slug : lessonId;
  };

  const solves = await db.query.solves.findMany({ where: eq(schema.solves.userId, userId) });
  const challengeIds = [...new Set(solves.map((s) => s.challengeId))];
  const challenges = challengeIds.length ? await db.query.challenges.findMany({ columns: { id: true, slug: true } }) : [];
  const slugOf = (id: string) => challenges.find((c) => c.id === id)?.slug ?? id;

  const hints = await db
    .select({ hintId: schema.hintUnlocks.hintId, challengeId: schema.challengeHints.challengeId })
    .from(schema.hintUnlocks)
    .innerJoin(schema.challengeHints, eq(schema.challengeHints.id, schema.hintUnlocks.hintId))
    .where(eq(schema.hintUnlocks.userId, userId));

  const regs = await db.select({ eventId: schema.eventRegistrations.eventId }).from(schema.eventRegistrations).where(eq(schema.eventRegistrations.userId, userId));
  const log = await db.select().from(schema.xpLedger).where(eq(schema.xpLedger.userId, userId)).orderBy(desc(schema.xpLedger.createdAt)).limit(60);
  const instances = await db.query.instances.findMany({
    where: and(eq(schema.instances.userId, userId), eq(schema.instances.status, "running"), gt(schema.instances.expiresAt, new Date())),
  });

  const solved: Record<string, string[]> = {};
  for (const s of solves) (solved[slugOf(s.challengeId)] ??= []).push(s.flagId);
  const revealedHints: Record<string, string[]> = {};
  for (const h of hints) (revealedHints[slugOf(h.challengeId)] ??= []).push(h.hintId);

  return {
    user: { id: user.id, handle: user.handle, displayName: user.displayName, avatarUrl: user.avatarUrl, role: user.role, schoolId: user.schoolId, school: user.school?.short ?? null },
    xp: await xpOf(userId),
    watched: Object.fromEntries(progress.map((p) => [keyOf(p.lessonId), p.watched])),
    completedLessons: progress.filter((p) => p.completedAt).map((p) => keyOf(p.lessonId)),
    checkpoints: Object.fromEntries(progress.map((p) => [keyOf(p.lessonId), p.checkpointsDone])),
    notes: Object.fromEntries(progress.filter((p) => p.note).map((p) => [keyOf(p.lessonId), p.note])),
    solved,
    revealedHints,
    instances: Object.fromEntries(instances.map((i) => [slugOf(i.challengeId), { host: i.host, port: i.port, expiresAt: i.expiresAt.toISOString(), startedAt: i.createdAt.getTime() }])),
    registeredEvents: regs.map((r) => r.eventId),
    log: log.map((e) => ({ id: e.id, kind: e.reason === "solve" ? "solve" : e.reason === "lesson" ? "lesson" : e.reason === "checkpoint" ? "checkpoint" : e.reason === "hint" ? "hint" : "rankup", label: e.label, xp: e.delta, at: e.createdAt.toISOString() })),
  };
}

/* ------------------------------ lessons ------------------------------ */
async function lessonByKey(trackSlug: string, lessonSlug: string) {
  const db = await getDb();
  const track = await db.query.tracks.findFirst({ where: eq(schema.tracks.slug, trackSlug), columns: { id: true } });
  if (!track) throw new ApiError(404, "track not found");
  const lesson = await db.query.lessons.findFirst({ where: and(eq(schema.lessons.trackId, track.id), eq(schema.lessons.slug, lessonSlug)) });
  if (!lesson) throw new ApiError(404, "lesson not found");
  return lesson;
}

async function upsertProgress(userId: string, lessonId: string, patch: Partial<typeof schema.lessonProgress.$inferInsert>) {
  const db = await getDb();
  const existing = await db.query.lessonProgress.findFirst({ where: and(eq(schema.lessonProgress.userId, userId), eq(schema.lessonProgress.lessonId, lessonId)) });
  if (existing) {
    await db.update(schema.lessonProgress).set(patch).where(and(eq(schema.lessonProgress.userId, userId), eq(schema.lessonProgress.lessonId, lessonId)));
    return { ...existing, ...patch };
  }
  const [row] = await db.insert(schema.lessonProgress).values({ userId, lessonId, ...patch }).returning();
  return row;
}

export async function setWatched(userId: string, trackSlug: string, lessonSlug: string, watched: number) {
  const lesson = await lessonByKey(trackSlug, lessonSlug);
  const db = await getDb();
  const existing = await db.query.lessonProgress.findFirst({ where: and(eq(schema.lessonProgress.userId, userId), eq(schema.lessonProgress.lessonId, lesson.id)) });
  const value = Math.max(existing?.watched ?? 0, Math.min(1, Math.max(0, watched)));
  await upsertProgress(userId, lesson.id, { watched: value });
  return { watched: value };
}

export async function answerCheckpoint(userId: string, trackSlug: string, lessonSlug: string, index: number) {
  const lesson = await lessonByKey(trackSlug, lessonSlug);
  const cp = lesson.checkpoints[index];
  if (!cp) throw new ApiError(400, "no such checkpoint");
  const db = await getDb();
  const existing = await db.query.lessonProgress.findFirst({ where: and(eq(schema.lessonProgress.userId, userId), eq(schema.lessonProgress.lessonId, lesson.id)) });
  const done = existing?.checkpointsDone ?? [];
  if (done.includes(index)) return { awarded: 0, checkpointsDone: done };
  const next = [...done, index];
  await upsertProgress(userId, lesson.id, { checkpointsDone: next });
  await ledger(userId, cp.xp, "checkpoint", lesson.id + "#" + index, "答對知識點檢查站");
  return { awarded: cp.xp, checkpointsDone: next };
}

export async function completeLesson(userId: string, trackSlug: string, lessonSlug: string) {
  const lesson = await lessonByKey(trackSlug, lessonSlug);
  const db = await getDb();
  const existing = await db.query.lessonProgress.findFirst({ where: and(eq(schema.lessonProgress.userId, userId), eq(schema.lessonProgress.lessonId, lesson.id)) });
  if (existing?.completedAt) return { awarded: 0 };
  const done = existing?.checkpointsDone ?? [];
  if (lesson.checkpoints.some((_, i) => !done.includes(i))) throw new ApiError(400, "還有檢查站沒通過");
  await upsertProgress(userId, lesson.id, { completedAt: new Date() });
  await ledger(userId, lesson.xp, "lesson", lesson.id, "完成課程 " + lesson.title);
  return { awarded: lesson.xp };
}

export async function setNote(userId: string, trackSlug: string, lessonSlug: string, note: string) {
  const lesson = await lessonByKey(trackSlug, lessonSlug);
  await upsertProgress(userId, lesson.id, { note: note.slice(0, 20_000) });
  return { ok: true };
}

/* ------------------------------ arena ------------------------------ */
/**
 * settings.xp.hintRefundOnSolve: give back what the hints cost once the
 * challenge is fully solved. Waits for every flag so a two-flag box cannot
 * be refunded on the user flag and then keep hinting towards root. The
 * `#hint-refund` ledger row is the idempotency key.
 */
async function refundHints(userId: string, challengeId: string, challengeName: string) {
  const { xp } = await getSettings();
  if (!xp.hintRefundOnSolve) return 0;

  const db = await getDb();
  const refId = challengeId + "#hint-refund";
  const done = await db.query.xpLedger.findFirst({
    where: and(eq(schema.xpLedger.userId, userId), eq(schema.xpLedger.refId, refId)),
  });
  if (done) return 0;

  const unlocked = await db
    .select({ cost: schema.challengeHints.cost })
    .from(schema.hintUnlocks)
    .innerJoin(schema.challengeHints, eq(schema.challengeHints.id, schema.hintUnlocks.hintId))
    .where(and(eq(schema.hintUnlocks.userId, userId), eq(schema.challengeHints.challengeId, challengeId)));

  const total = unlocked.reduce((n, h) => n + h.cost, 0);
  if (total <= 0) return 0;
  await ledger(userId, total, "hint", refId, "解出後退還提示 XP（" + challengeName + "）");
  return total;
}

export async function attemptFlag(userId: string, slug: string, submission: string) {
  const db = await getDb();
  const ch = await db.query.challenges.findFirst({ where: eq(schema.challenges.slug, slug), with: { flags: true } });
  if (!ch || ch.status !== "published") throw new ApiError(404, "challenge not found");

  // crude rate limit: 20 attempts per 5 minutes per challenge
  const [{ n }] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(schema.attempts)
    .where(and(eq(schema.attempts.userId, userId), eq(schema.attempts.challengeId, ch.id), gte(schema.attempts.createdAt, new Date(Date.now() - 5 * 60_000))));
  if (Number(n) >= 20) throw new ApiError(429, "試太多次了，休息五分鐘再來");

  const hash = await sha256Hex(normalizeFlag(submission));
  const hit = ch.flags.find((f) => f.sha256 === hash);
  await db.insert(schema.attempts).values({ userId, challengeId: ch.id, submissionSha256: hash, correct: Boolean(hit) });
  if (!hit) return { status: "incorrect" as const, message: "Flag 不對。檢查格式：SCIST{...}，大小寫要一樣。" };

  const already = await db.query.solves.findFirst({ where: and(eq(schema.solves.userId, userId), eq(schema.solves.challengeId, ch.id), eq(schema.solves.flagId, hit.flagId)) });
  if (already) return { status: "already_solved" as const, message: "這個 flag 你已經交過了。", flagId: hit.flagId, points: 0 };

  const [{ before }] = await db.select({ before: sql<number>`count(*)::int` }).from(schema.solves).where(and(eq(schema.solves.challengeId, ch.id), eq(schema.solves.flagId, hit.flagId)));
  await db.insert(schema.solves).values({ userId, challengeId: ch.id, flagId: hit.flagId });
  await ledger(userId, hit.points, "solve", ch.id + "#" + hit.flagId, "解出 " + ch.name + (ch.flags.length > 1 ? "（" + hit.label + "）" : ""));

  const firstBlood = Number(before) === 0;
  if (firstBlood) {
    const user = await db.query.users.findFirst({ where: eq(schema.users.id, userId), columns: { handle: true } });
    const m = firstBloodMessage({ handle: user?.handle ?? "someone", challenge: ch.name, url: (env().APP_URL ?? "") + "/challenges/" + ch.slug });
    void notifyDiscord(m.content, m.embeds);
  }

  const mine = await db.query.solves.findMany({
    where: and(eq(schema.solves.userId, userId), eq(schema.solves.challengeId, ch.id)),
    columns: { flagId: true },
  });
  const complete = ch.flags.every((f) => mine.some((s) => s.flagId === f.flagId));
  const refunded = complete ? await refundHints(userId, ch.id, ch.name) : 0;

  return {
    status: "correct" as const,
    message: hit.flagId === "root" ? "Root 拿下！" : "正確！",
    flagId: hit.flagId,
    points: hit.points,
    firstBlood,
    refunded,
  };
}

export async function unlockHint(userId: string, slug: string, hintId: string) {
  const db = await getDb();
  const ch = await db.query.challenges.findFirst({ where: eq(schema.challenges.slug, slug), with: { hints: true } });
  if (!ch) throw new ApiError(404, "challenge not found");
  const hint = ch.hints.find((h) => h.id === hintId);
  if (!hint) throw new ApiError(404, "hint not found");
  const ordered = [...ch.hints].sort((a, b) => a.sortOrder - b.sortOrder);
  const idx = ordered.findIndex((h) => h.id === hintId);
  const existing = await db.query.hintUnlocks.findFirst({ where: and(eq(schema.hintUnlocks.userId, userId), eq(schema.hintUnlocks.hintId, hintId)) });
  if (existing) return { text: hint.text, cost: 0 };
  if (idx > 0) {
    const prev = await db.query.hintUnlocks.findFirst({ where: and(eq(schema.hintUnlocks.userId, userId), eq(schema.hintUnlocks.hintId, ordered[idx - 1].id)) });
    if (!prev) throw new ApiError(400, "先解鎖上一則提示");
  }
  await db.insert(schema.hintUnlocks).values({ userId, hintId });
  await ledger(userId, -hint.cost, "hint", hintId, "解鎖提示 " + ch.name);
  return { text: hint.text, cost: hint.cost };
}

/* ------------------------------ instances ------------------------------ */
export async function spawnInstance(userId: string, slug: string) {
  const db = await getDb();
  const { features } = await getSettings();
  if (!features.instances) throw new ApiError(403, "目前沒有開放個人靶機");
  const ch = await db.query.challenges.findFirst({ where: eq(schema.challenges.slug, slug) });
  if (!ch) throw new ApiError(404, "challenge not found");
  if (ch.connectionType === "none") throw new ApiError(400, "這題不需要環境");
  const running = await db.query.instances.findFirst({ where: and(eq(schema.instances.userId, userId), eq(schema.instances.challengeId, ch.id), eq(schema.instances.status, "running")) });
  if (running && running.expiresAt > new Date()) return toInstance(running, ch.connectionType);

  if (!ch.instanceImage) {
    // shared static target: nothing to start, just hand out the address
    return { host: ch.connectionValue ?? "", port: null, expiresAt: null, type: ch.connectionType, shared: true };
  }
  const spawned = await instancer.spawn({ image: ch.instanceImage, port: ch.instancePort ?? 80, ttlMinutes: ch.instanceTtlMin, userId, challengeId: ch.id });
  const [row] = await db
    .insert(schema.instances)
    .values({ userId, challengeId: ch.id, externalId: spawned.externalId, host: spawned.host, port: spawned.port, status: "running", expiresAt: spawned.expiresAt })
    .returning();
  return toInstance(row, ch.connectionType);
}

function toInstance(row: typeof schema.instances.$inferSelect, type: string) {
  return { id: row.id, host: row.host, port: row.port, expiresAt: row.expiresAt.toISOString(), type, shared: false };
}

export async function killInstance(userId: string, slug: string) {
  const db = await getDb();
  const ch = await db.query.challenges.findFirst({ where: eq(schema.challenges.slug, slug), columns: { id: true } });
  if (!ch) throw new ApiError(404, "challenge not found");
  const rows = await db.query.instances.findMany({ where: and(eq(schema.instances.userId, userId), eq(schema.instances.challengeId, ch.id), eq(schema.instances.status, "running")) });
  for (const r of rows) {
    if (r.externalId) await instancer.kill(r.externalId);
    await db.update(schema.instances).set({ status: "stopped" }).where(eq(schema.instances.id, r.id));
  }
  return { stopped: rows.length };
}

/* ------------------------------ events ------------------------------ */
export async function setEventRegistration(userId: string, eventId: string, on: boolean) {
  const db = await getDb();
  const ev = await db.query.events.findFirst({ where: eq(schema.events.id, eventId), with: { registrations: true } });
  if (!ev) throw new ApiError(404, "event not found");
  if (on) {
    if (ev.baseRegistered + ev.registrations.length >= ev.capacity) throw new ApiError(409, "名額已滿");
    await db.insert(schema.eventRegistrations).values({ userId, eventId }).onConflictDoNothing();
  } else {
    await db.delete(schema.eventRegistrations).where(and(eq(schema.eventRegistrations.userId, userId), eq(schema.eventRegistrations.eventId, eventId)));
  }
  return { registered: on };
}

/* ------------------------------ leaderboard ------------------------------ */
export async function leaderboard(scope: "weekly" | "alltime" | "schools", weekStartsOn = 0) {
  const db = await getDb();
  const since = scope === "weekly" ? gte(schema.xpLedger.createdAt, weekStart(weekStartsOn)) : undefined;
  const rows = await db
    .select({
      userId: schema.xpLedger.userId,
      xp: sql<number>`sum(${schema.xpLedger.delta})::int`,
    })
    .from(schema.xpLedger)
    .where(since)
    .groupBy(schema.xpLedger.userId)
    .orderBy(desc(sql`sum(${schema.xpLedger.delta})`))
    .limit(200);

  const users = rows.length ? await db.query.users.findMany({ with: { school: true } }) : [];
  const solveCounts = await db.select({ userId: schema.solves.userId, n: sql<number>`count(*)::int` }).from(schema.solves).groupBy(schema.solves.userId);

  const entries = rows
    .map((r) => {
      const u = users.find((x) => x.id === r.userId);
      if (!u || u.bannedAt) return null;
      return {
        id: u.id,
        handle: u.handle,
        schoolId: u.schoolId,
        school: u.school?.short ?? null,
        role: u.role,
        xp: Number(r.xp),
        solves: Number(solveCounts.find((s) => s.userId === u.id)?.n ?? 0),
        isAssistant: u.role === "ta" || u.role === "instructor",
      };
    })
    .filter((x): x is NonNullable<typeof x> => Boolean(x));

  if (scope !== "schools") return entries;

  const bySchool = new Map<string, { schoolId: string; school: string; xp: number; members: number; solves: number }>();
  for (const e of entries) {
    if (!e.schoolId) continue;
    const cur = bySchool.get(e.schoolId) ?? { schoolId: e.schoolId, school: e.school ?? e.schoolId, xp: 0, members: 0, solves: 0 };
    cur.xp += e.xp;
    cur.members += 1;
    cur.solves += e.solves;
    bySchool.set(e.schoolId, cur);
  }
  return [...bySchool.values()].sort((a, b) => b.xp - a.xp);
}
