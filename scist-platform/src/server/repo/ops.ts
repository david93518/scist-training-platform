/**
 * Operations: audit log, running instances, analytics.
 * Everything here is read by the admin console only.
 */
import { and, asc, desc, eq, gte, inArray, lt, sql } from "drizzle-orm";
import { getDb, schema } from "../db";
import { ApiError } from "../auth";
import * as instancer from "../services/instancer";
import type { AdminAnalytics, AdminInstance, AuditAction, AuditEntry } from "@/admin/types";
import { CATEGORY_META, type Category } from "@/data/challenges";
import { schoolById } from "@/data/schools";

/* ------------------------------ audit ------------------------------ */
export async function audit(actorId: string | null, action: AuditAction, entity: string, entityId: string | null, label: string) {
  const db = await getDb();
  await db.insert(schema.auditLog).values({ actorId, action, entity, entityId, detail: { label } });
}

export async function listAudit(limit = 200): Promise<AuditEntry[]> {
  const db = await getDb();
  const rows = await db
    .select({
      id: schema.auditLog.id,
      action: schema.auditLog.action,
      entity: schema.auditLog.entity,
      entityId: schema.auditLog.entityId,
      detail: schema.auditLog.detail,
      at: schema.auditLog.createdAt,
      handle: schema.users.handle,
    })
    .from(schema.auditLog)
    .leftJoin(schema.users, eq(schema.users.id, schema.auditLog.actorId))
    .orderBy(desc(schema.auditLog.createdAt))
    .limit(limit);
  return rows.map((r) => ({
    id: r.id,
    actorHandle: r.handle ?? "system",
    action: r.action as AuditAction,
    entity: r.entity,
    entityId: r.entityId,
    label: String((r.detail as { label?: unknown } | null)?.label ?? ""),
    at: r.at.toISOString(),
  }));
}

/* ------------------------------ instances ------------------------------ */
const LIVE: ("starting" | "running")[] = ["starting", "running"];

/**
 * The instancer reclaims containers on its own schedule and never tells us,
 * so rows sit at "running" long after the container is gone. Anything past
 * its TTL is marked stopped before we read the list.
 */
export async function expireInstances() {
  const db = await getDb();
  await db
    .update(schema.instances)
    .set({ status: "stopped" })
    .where(and(inArray(schema.instances.status, LIVE), lt(schema.instances.expiresAt, new Date())));
}

export async function listInstancesAdmin(): Promise<AdminInstance[]> {
  const db = await getDb();
  await expireInstances();
  const rows = await db
    .select({
      id: schema.instances.id,
      userId: schema.instances.userId,
      handle: schema.users.handle,
      challengeId: schema.instances.challengeId,
      slug: schema.challenges.slug,
      name: schema.challenges.name,
      host: schema.instances.host,
      port: schema.instances.port,
      status: schema.instances.status,
      createdAt: schema.instances.createdAt,
      expiresAt: schema.instances.expiresAt,
    })
    .from(schema.instances)
    .innerJoin(schema.users, eq(schema.users.id, schema.instances.userId))
    .innerJoin(schema.challenges, eq(schema.challenges.id, schema.instances.challengeId))
    .where(inArray(schema.instances.status, LIVE))
    .orderBy(desc(schema.instances.createdAt))
    .limit(500);
  return rows.map((r) => ({
    id: r.id,
    userId: r.userId,
    userHandle: r.handle,
    challengeId: r.challengeId,
    challengeSlug: r.slug,
    challengeName: r.name,
    host: r.host,
    port: r.port,
    status: r.status,
    createdAt: r.createdAt.toISOString(),
    expiresAt: r.expiresAt.toISOString(),
  }));
}

/** Stops one instance; returns a human label for the audit log. */
export async function killInstanceAdmin(id: string) {
  const db = await getDb();
  const [row] = await db.select().from(schema.instances).where(eq(schema.instances.id, id));
  if (!row) throw new ApiError(404, "找不到這個環境");
  if (row.externalId) await instancer.kill(row.externalId).catch(() => undefined);
  await db.update(schema.instances).set({ status: "stopped" }).where(eq(schema.instances.id, id));
  const [u] = await db.select({ handle: schema.users.handle }).from(schema.users).where(eq(schema.users.id, row.userId));
  const [c] = await db.select({ name: schema.challenges.name }).from(schema.challenges).where(eq(schema.challenges.id, row.challengeId));
  return (u?.handle ?? row.userId) + " · " + (c?.name ?? row.challengeId);
}

export async function killAllInstances() {
  const db = await getDb();
  const rows = await db.select().from(schema.instances).where(inArray(schema.instances.status, LIVE));
  for (const r of rows) if (r.externalId) await instancer.kill(r.externalId).catch(() => undefined);
  if (rows.length) {
    await db
      .update(schema.instances)
      .set({ status: "stopped" })
      .where(inArray(schema.instances.id, rows.map((r) => r.id)));
  }
  return rows.length;
}

/* ------------------------------ analytics ------------------------------ */
const WEEK = 7 * 86400_000;

export async function getAnalytics(): Promise<AdminAnalytics> {
  const db = await getDb();
  const now = new Date();
  const since = new Date(now.getTime() - 12 * WEEK);

  const ledger = await db.select({ userId: schema.xpLedger.userId, at: schema.xpLedger.createdAt }).from(schema.xpLedger).where(gte(schema.xpLedger.createdAt, since));
  const solveRows = await db.select({ userId: schema.solves.userId, challengeId: schema.solves.challengeId, at: schema.solves.solvedAt }).from(schema.solves);
  const progress = await db
    .select({ userId: schema.lessonProgress.userId, lessonId: schema.lessonProgress.lessonId, completedAt: schema.lessonProgress.completedAt })
    .from(schema.lessonProgress);
  const attemptRows = await db.select({ challengeId: schema.attempts.challengeId, n: sql<number>`count(*)::int` }).from(schema.attempts).groupBy(schema.attempts.challengeId);
  const users = await db.select({ id: schema.users.id, schoolId: schema.users.schoolId }).from(schema.users);
  const xpTotals = await db.select({ userId: schema.xpLedger.userId, xp: sql<number>`sum(${schema.xpLedger.delta})::int` }).from(schema.xpLedger).groupBy(schema.xpLedger.userId);
  const tracks = await db
    .select({ id: schema.tracks.id, name: schema.tracks.name, color: schema.tracks.color })
    .from(schema.tracks)
    .where(eq(schema.tracks.status, "published"))
    .orderBy(asc(schema.tracks.sortOrder));
  const lessons = await db.select({ id: schema.lessons.id, title: schema.lessons.title, trackId: schema.lessons.trackId }).from(schema.lessons).where(eq(schema.lessons.status, "published"));
  const challenges = await db
    .select({ id: schema.challenges.id, category: schema.challenges.category, baseSolves: schema.challenges.baseSolves, difficulty: schema.challenges.difficulty })
    .from(schema.challenges)
    .where(eq(schema.challenges.status, "published"));

  // 12 weekly windows ending now, oldest first
  const weeks = Array.from({ length: 12 }, (_, k) => {
    const start = new Date(now.getTime() - (12 - k) * WEEK);
    const end = new Date(start.getTime() + WEEK);
    const inWin = (d: Date) => d >= start && d < end;
    return {
      label: start.getMonth() + 1 + "/" + start.getDate(),
      active: new Set(ledger.filter((l) => inWin(l.at)).map((l) => l.userId)).size,
      solves: solveRows.filter((s) => inWin(s.at)).length,
      completions: progress.filter((p) => p.completedAt && inWin(p.completedAt)).length,
    };
  });

  const funnel = [
    { label: "註冊", value: users.length },
    { label: "開始第一堂課", value: new Set(progress.map((p) => p.userId)).size },
    { label: "完成一堂課", value: new Set(progress.filter((p) => p.completedAt).map((p) => p.userId)).size },
    { label: "解出第一題", value: new Set(solveRows.map((s) => s.userId)).size },
  ];

  const trackStats = tracks.map((t) => {
    const ids = new Set(lessons.filter((l) => l.trackId === t.id).map((l) => l.id));
    const rows = progress.filter((p) => ids.has(p.lessonId));
    const learners = new Set(rows.map((r) => r.userId)).size;
    const completions = rows.filter((r) => r.completedAt).length;
    return { id: t.id, name: t.name, color: t.color, lessons: ids.size, learners, completions, rate: learners && ids.size ? completions / (learners * ids.size) : 0 };
  });

  // same blend as the overview's 卡關點: real traffic plus the seed numbers by difficulty
  const categories = (Object.keys(CATEGORY_META) as Category[]).map((cat) => {
    let attempts = 0;
    let solvesN = 0;
    for (const c of challenges.filter((x) => x.category === cat)) {
      const factor = c.difficulty === "insane" ? 5 : c.difficulty === "hard" ? 3.6 : c.difficulty === "medium" ? 2.4 : 1.5;
      attempts += Number(attemptRows.find((a) => a.challengeId === c.id)?.n ?? 0) + Math.round(c.baseSolves * factor);
      solvesN += solveRows.filter((s) => s.challengeId === c.id).length + c.baseSolves;
    }
    return { category: cat, label: CATEGORY_META[cat].label, color: CATEGORY_META[cat].color, attempts, solves: solvesN, rate: attempts ? solvesN / attempts : 0 };
  });

  const bySchool = new Map<string, { members: number; xp: number; solves: number }>();
  for (const u of users) {
    if (!u.schoolId) continue;
    const e = bySchool.get(u.schoolId) ?? { members: 0, xp: 0, solves: 0 };
    e.members += 1;
    e.xp += Number(xpTotals.find((x) => x.userId === u.id)?.xp ?? 0);
    e.solves += solveRows.filter((s) => s.userId === u.id).length;
    bySchool.set(u.schoolId, e);
  }
  const schools = [...bySchool.entries()]
    .map(([schoolId, e]) => ({ schoolId, school: schoolById(schoolId)?.short ?? schoolId, ...e }))
    .sort((a, b) => b.xp - a.xp)
    .slice(0, 10);

  const dropoff = lessons
    .map((l) => {
      const rows = progress.filter((p) => p.lessonId === l.id);
      const completed = rows.filter((r) => r.completedAt).length;
      return { id: l.id, title: l.title, track: tracks.find((t) => t.id === l.trackId)?.name ?? "", started: rows.length, completed, rate: rows.length ? completed / rows.length : 0 };
    })
    .filter((d) => d.started > 0)
    .sort((a, b) => a.rate - b.rate)
    .slice(0, 6);

  return { generatedAt: now.toISOString(), weeks, funnel, tracks: trackStats, categories, schools, dropoff };
}
