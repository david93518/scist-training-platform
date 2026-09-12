import { desc, eq, sql } from "drizzle-orm";
import { getDb, schema } from "../db";
import { ApiError } from "../auth";
import type { AdminUser, AdminUserDetail, Role, XpReason } from "@/admin/types";

export async function listUsersAdmin(): Promise<AdminUser[]> {
  const db = await getDb();
  const users = await db.select().from(schema.users).orderBy(desc(schema.users.createdAt)).limit(500);
  const xp = await db.select({ userId: schema.xpLedger.userId, xp: sql<number>`sum(${schema.xpLedger.delta})::int` }).from(schema.xpLedger).groupBy(schema.xpLedger.userId);
  const solves = await db.select({ userId: schema.solves.userId, n: sql<number>`count(*)::int` }).from(schema.solves).groupBy(schema.solves.userId);
  // 助教貢獻：回答總數，以及其中被發問者採納的數量
  const answers = await db.select({ userId: schema.answers.authorId, n: sql<number>`count(*)::int` }).from(schema.answers).groupBy(schema.answers.authorId);
  const accepted = await db
    .select({ userId: schema.answers.authorId, n: sql<number>`count(*)::int` })
    .from(schema.answers)
    .innerJoin(schema.questions, eq(schema.questions.acceptedAnswerId, schema.answers.id))
    .groupBy(schema.answers.authorId);

  return users
    .map((u) => ({
      id: u.id,
      handle: u.handle,
      displayName: u.displayName ?? u.handle,
      schoolId: u.schoolId,
      role: u.role as Role,
      xp: Number(xp.find((x) => x.userId === u.id)?.xp ?? 0),
      solves: Number(solves.find((s) => s.userId === u.id)?.n ?? 0),
      answers: Number(answers.find((a) => a.userId === u.id)?.n ?? 0),
      accepted: Number(accepted.find((a) => a.userId === u.id)?.n ?? 0),
      lastSeenAt: u.lastSeenAt?.toISOString() ?? null,
      bannedAt: u.bannedAt?.toISOString() ?? null,
      hasPassword: Boolean(u.passwordHash),
    }))
    .sort((a, b) => b.xp - a.xp);
}

export async function getUserDetail(id: string): Promise<AdminUserDetail> {
  const db = await getDb();
  const [u] = await db.select().from(schema.users).where(eq(schema.users.id, id));
  if (!u) throw new ApiError(404, "找不到這個帳號");

  const ledger = await db.select().from(schema.xpLedger).where(eq(schema.xpLedger.userId, id)).orderBy(desc(schema.xpLedger.createdAt)).limit(60);
  const [totals] = await db
    .select({ xp: sql<number>`coalesce(sum(${schema.xpLedger.delta}), 0)::int` })
    .from(schema.xpLedger)
    .where(eq(schema.xpLedger.userId, id));
  const solveRows = await db
    .select({ slug: schema.challenges.slug, name: schema.challenges.name, flagId: schema.solves.flagId, at: schema.solves.solvedAt, challengeId: schema.solves.challengeId })
    .from(schema.solves)
    .innerJoin(schema.challenges, eq(schema.challenges.id, schema.solves.challengeId))
    .where(eq(schema.solves.userId, id))
    .orderBy(desc(schema.solves.solvedAt))
    .limit(60);
  const flagPoints = await db.select({ challengeId: schema.challengeFlags.challengeId, flagId: schema.challengeFlags.flagId, points: schema.challengeFlags.points }).from(schema.challengeFlags);
  const lessons = await db
    .select({ title: schema.lessons.title, track: schema.tracks.name, watched: schema.lessonProgress.watched, completedAt: schema.lessonProgress.completedAt, updatedAt: schema.lessonProgress.updatedAt })
    .from(schema.lessonProgress)
    .innerJoin(schema.lessons, eq(schema.lessons.id, schema.lessonProgress.lessonId))
    .innerJoin(schema.tracks, eq(schema.tracks.id, schema.lessons.trackId))
    .where(eq(schema.lessonProgress.userId, id))
    .orderBy(desc(schema.lessonProgress.updatedAt))
    .limit(60);
  const [q] = await db.select({ n: sql<number>`count(*)::int` }).from(schema.questions).where(eq(schema.questions.authorId, id));
  const [answered] = await db.select({ n: sql<number>`count(*)::int` }).from(schema.answers).where(eq(schema.answers.authorId, id));
  const [acceptedCount] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(schema.answers)
    .innerJoin(schema.questions, eq(schema.questions.acceptedAnswerId, schema.answers.id))
    .where(eq(schema.answers.authorId, id));

  return {
    user: {
      id: u.id,
      handle: u.handle,
      displayName: u.displayName ?? u.handle,
      schoolId: u.schoolId,
      role: u.role as Role,
      xp: Number(totals?.xp ?? 0),
      solves: solveRows.length,
      answers: Number(answered?.n ?? 0),
      accepted: Number(acceptedCount?.n ?? 0),
      lastSeenAt: u.lastSeenAt?.toISOString() ?? null,
      bannedAt: u.bannedAt?.toISOString() ?? null,
      hasPassword: Boolean(u.passwordHash),
    },
    joinedAt: u.createdAt.toISOString(),
    ledger: ledger.map((l) => ({ id: l.id, delta: l.delta, reason: l.reason as XpReason, label: l.label, at: l.createdAt.toISOString() })),
    solves: solveRows.map((s) => ({
      slug: s.slug,
      name: s.name + (s.flagId !== "flag" ? " · " + s.flagId : ""),
      points: Number(flagPoints.find((f) => f.challengeId === s.challengeId && f.flagId === s.flagId)?.points ?? 0),
      at: s.at.toISOString(),
    })),
    lessons: lessons.map((l) => ({ title: l.title, track: l.track, watched: l.watched, completed: Boolean(l.completedAt) })),
    questions: Number(q?.n ?? 0),
  };
}

/** 帳號的帳號名與角色，給操作紀錄取「改之前是什麼」用 */
export async function findUserBasic(id: string) {
  const db = await getDb();
  const [u] = await db.select({ handle: schema.users.handle, role: schema.users.role }).from(schema.users).where(eq(schema.users.id, id));
  return u ?? null;
}

export async function setUserRole(actor: { id: string; role: Role }, id: string, role: Role) {
  if (actor.role !== "admin") throw new ApiError(403, "只有管理員能改角色");
  if (actor.id === id && role !== "admin") throw new ApiError(400, "不能把自己降級");
  const db = await getDb();
  // without this an unknown id returned 204 and wrote an audit row for something that never happened
  const [target] = await db.select({ id: schema.users.id }).from(schema.users).where(eq(schema.users.id, id));
  if (!target) throw new ApiError(404, "找不到這個帳號");
  await db.update(schema.users).set({ role }).where(eq(schema.users.id, id));
}

export async function setUserBanned(actor: { id: string; role: Role }, id: string, banned: boolean) {
  if (actor.role !== "admin") throw new ApiError(403, "只有管理員能停權");
  if (actor.id === id) throw new ApiError(400, "不能停權自己");
  const db = await getDb();
  const [target] = await db.select({ id: schema.users.id }).from(schema.users).where(eq(schema.users.id, id));
  if (!target) throw new ApiError(404, "找不到這個帳號");
  await db.update(schema.users).set({ bannedAt: banned ? new Date() : null }).where(eq(schema.users.id, id));
}

/** Manual XP correction. Goes through the ledger like everything else, so the leaderboard stays consistent. */
export async function adjustXp(actor: { id: string; role: Role }, id: string, delta: number, reason: string) {
  if (actor.role !== "admin") throw new ApiError(403, "只有管理員能調整 XP");
  const db = await getDb();
  const [u] = await db.select({ id: schema.users.id }).from(schema.users).where(eq(schema.users.id, id));
  if (!u) throw new ApiError(404, "找不到這個帳號");
  await db.insert(schema.xpLedger).values({ userId: id, delta, reason: "admin", refId: actor.id, label: reason });
  const [row] = await db
    .select({ xp: sql<number>`coalesce(sum(${schema.xpLedger.delta}), 0)::int` })
    .from(schema.xpLedger)
    .where(eq(schema.xpLedger.userId, id));
  return Number(row?.xp ?? 0);
}
