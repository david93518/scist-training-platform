/**
 * Settings (key/value JSON), integration status and the admin dashboard stats.
 */
import { desc, eq, gte, sql } from "drizzle-orm";
import { getDb, schema, dbKind } from "../db";
import { features } from "../env";
import { RANKS } from "@/lib/xp";
import type { AdminSettings, AdminStats, IntegrationStatus } from "@/admin/types";

export const DEFAULT_SETTINGS: AdminSettings = {
  site: { name: "SCIST Gate", tagline: "資安的第一道門", discordInvite: "https://discord.gg/scist", launch: "2026-10" },
  ranks: RANKS.map((r) => ({ id: r.id, name: r.name, en: r.en, minXp: r.minXp, color: r.color, blurb: r.blurb })),
  xp: { checkpointDefault: 25, lessonDefault: 80, hintRefundOnSolve: false },
  leaderboard: { weekStartsOn: 0 },
  features: { guestProgress: true, instances: true, questions: true },
};

export async function getSettings(): Promise<AdminSettings> {
  const db = await getDb();
  const rows = await db.select().from(schema.settings);
  const map = Object.fromEntries(rows.map((r) => [r.key, r.value]));
  return {
    site: { ...DEFAULT_SETTINGS.site, ...(map.site as object) },
    ranks: (map.ranks as AdminSettings["ranks"]) ?? DEFAULT_SETTINGS.ranks,
    xp: { ...DEFAULT_SETTINGS.xp, ...(map.xp as object) },
    leaderboard: { ...DEFAULT_SETTINGS.leaderboard, ...(map.leaderboard as object) },
    features: { ...DEFAULT_SETTINGS.features, ...(map.features as object) },
  };
}

export async function saveSettings(input: AdminSettings, actorId?: string): Promise<AdminSettings> {
  const db = await getDb();
  for (const [key, value] of Object.entries(input)) {
    await db
      .insert(schema.settings)
      .values({ key, value, updatedBy: actorId ?? null })
      .onConflictDoUpdate({ target: schema.settings.key, set: { value, updatedBy: actorId ?? null } });
  }
  return getSettings();
}

export function getStatus(): IntegrationStatus {
  return {
    mode: "http",
    database: dbKind() === "postgres" ? "postgres" : "pglite",
    discordLogin: features.discordLogin(),
    stream: features.stream(),
    r2: features.r2(),
    instancer: features.instancer(),
    webhook: features.discordWebhook(),
  };
}

export async function getStats(): Promise<AdminStats> {
  const db = await getDb();
  const count = async (q: Promise<{ n: number }[]>) => Number((await q)[0]?.n ?? 0);
  const weekAgo = new Date(Date.now() - 7 * 86400_000);

  const users = await count(db.select({ n: sql<number>`count(*)::int` }).from(schema.users));
  const activeWeek = await count(db.select({ n: sql<number>`count(distinct ${schema.xpLedger.userId})::int` }).from(schema.xpLedger).where(gte(schema.xpLedger.createdAt, weekAgo)));
  const lessonsCompleted = await count(db.select({ n: sql<number>`count(*)::int` }).from(schema.lessonProgress).where(sql`${schema.lessonProgress.completedAt} is not null`));
  const solves = await count(db.select({ n: sql<number>`count(*)::int` }).from(schema.solves));
  const drafts =
    (await count(db.select({ n: sql<number>`count(*)::int` }).from(schema.lessons).where(eq(schema.lessons.status, "draft")))) +
    (await count(db.select({ n: sql<number>`count(*)::int` }).from(schema.challenges).where(eq(schema.challenges.status, "draft")))) +
    (await count(db.select({ n: sql<number>`count(*)::int` }).from(schema.events).where(eq(schema.events.status, "draft"))));

  // stuck points: attempts vs distinct solvers per challenge
  const attemptRows = await db.select({ challengeId: schema.attempts.challengeId, n: sql<number>`count(*)::int` }).from(schema.attempts).groupBy(schema.attempts.challengeId);
  const solveRows = await db.select({ challengeId: schema.solves.challengeId, n: sql<number>`count(distinct ${schema.solves.userId})::int` }).from(schema.solves).groupBy(schema.solves.challengeId);
  const challenges = await db.select({ id: schema.challenges.id, slug: schema.challenges.slug, name: schema.challenges.name, baseSolves: schema.challenges.baseSolves, difficulty: schema.challenges.difficulty }).from(schema.challenges).where(eq(schema.challenges.status, "published"));
  const stuck = challenges
    .map((c) => {
      const realAttempts = Number(attemptRows.find((a) => a.challengeId === c.id)?.n ?? 0);
      const realSolves = Number(solveRows.find((s) => s.challengeId === c.id)?.n ?? 0);
      // before real traffic exists, estimate from seed numbers by difficulty
      const factor = c.difficulty === "insane" ? 5 : c.difficulty === "hard" ? 3.6 : c.difficulty === "medium" ? 2.4 : 1.5;
      const attempts = realAttempts + Math.round(c.baseSolves * factor);
      const solved = realSolves + c.baseSolves;
      return { slug: c.slug, name: c.name, attempts, solves: solved, rate: attempts ? solved / attempts : 0 };
    })
    .sort((a, b) => a.rate - b.rate)
    .slice(0, 6);

  const recentLessons = await db.select().from(schema.lessons).orderBy(desc(schema.lessons.updatedAt)).limit(5);
  const recentChallenges = await db.select().from(schema.challenges).orderBy(desc(schema.challenges.updatedAt)).limit(5);
  const recent = [
    ...recentLessons.map((l) => ({ kind: "lesson" as const, title: l.title, at: l.updatedAt.toISOString(), status: l.status })),
    ...recentChallenges.map((c) => ({ kind: "challenge" as const, title: c.name, at: c.updatedAt.toISOString(), status: c.status })),
  ]
    .sort((a, b) => b.at.localeCompare(a.at))
    .slice(0, 8);

  return { users, activeWeek, lessonsCompleted, solves, drafts, stuck, recent };
}
