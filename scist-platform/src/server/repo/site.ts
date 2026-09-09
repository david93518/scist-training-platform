/**
 * Read-only data for the public pages that is not curriculum content:
 * instructors, the leaderboard roster, headline numbers, the activity feed.
 * Shapes match src/data so the components did not have to change.
 */
import { and, desc, eq, gte, inArray, isNotNull, isNull, sql } from "drizzle-orm";
import { getDb, schema } from "../db";
import type { Instructor } from "@/data/instructors";
import type { Player, SchoolStanding } from "@/data/players";
import type { Activity } from "@/data/activity";
import { schoolById } from "@/data/schools";
import { relativeTime } from "@/lib/utils";

const DAY = 86400_000;

/* ------------------------------ instructors ------------------------------ */
export async function getInstructorsPublic(): Promise<Instructor[]> {
  const db = await getDb();
  const rows = await db.query.instructors.findMany({ orderBy: (t, { asc }) => [asc(t.sortOrder), asc(t.name)] });
  return rows.map((r) => ({ id: r.id, name: r.name, handle: r.handle, role: r.role, domains: r.domains, bio: r.bio, creds: r.creds, accent: r.accent }));
}

/* ------------------------------ headline numbers ------------------------------ */
export interface SiteStats {
  users: number;
  monthlyActive: number;
  tracks: number;
  lessons: number;
  challenges: number;
  boxes: number;
  totalPoints: number;
}

export async function getSiteStats(): Promise<SiteStats> {
  const db = await getDb();
  const n = async (q: Promise<{ n: number }[]>) => Number((await q)[0]?.n ?? 0);
  const monthAgo = new Date(Date.now() - 30 * DAY);
  const [users, monthlyActive, tracks, lessons, challenges, boxes, totalPoints] = await Promise.all([
    n(db.select({ n: sql<number>`count(*)::int` }).from(schema.users).where(isNull(schema.users.bannedAt))),
    n(db.select({ n: sql<number>`count(distinct ${schema.xpLedger.userId})::int` }).from(schema.xpLedger).where(gte(schema.xpLedger.createdAt, monthAgo))),
    n(db.select({ n: sql<number>`count(*)::int` }).from(schema.tracks).where(eq(schema.tracks.status, "published"))),
    n(db.select({ n: sql<number>`count(*)::int` }).from(schema.lessons).where(eq(schema.lessons.status, "published"))),
    n(db.select({ n: sql<number>`count(*)::int` }).from(schema.challenges).where(eq(schema.challenges.status, "published"))),
    n(db.select({ n: sql<number>`count(*)::int` }).from(schema.challenges).where(and(eq(schema.challenges.status, "published"), eq(schema.challenges.kind, "box")))),
    n(
      db
        .select({ n: sql<number>`coalesce(sum(${schema.challengeFlags.points}), 0)::int` })
        .from(schema.challengeFlags)
        .innerJoin(schema.challenges, eq(schema.challenges.id, schema.challengeFlags.challengeId))
        .where(eq(schema.challenges.status, "published")),
    ),
  ]);
  return { users, monthlyActive, tracks, lessons, challenges, boxes, totalPoints };
}

/* ------------------------------ leaderboard roster ------------------------------ */
function weekStart(weekStartsOn: number) {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const diff = (start.getDay() - weekStartsOn + 7) % 7;
  start.setDate(start.getDate() - diff);
  return start;
}

/** Everyone with XP, all-time and this week, in the Player shape the boards render. */
export async function getPlayersPublic(weekStartsOn = 0): Promise<Player[]> {
  const db = await getDb();
  const users = await db.query.users.findMany({ where: isNull(schema.users.bannedAt) });
  const totals = await db.select({ userId: schema.xpLedger.userId, xp: sql<number>`sum(${schema.xpLedger.delta})::int` }).from(schema.xpLedger).groupBy(schema.xpLedger.userId);
  const weekly = await db
    .select({ userId: schema.xpLedger.userId, xp: sql<number>`sum(${schema.xpLedger.delta})::int` })
    .from(schema.xpLedger)
    .where(gte(schema.xpLedger.createdAt, weekStart(weekStartsOn)))
    .groupBy(schema.xpLedger.userId);
  const solves = await db.select({ userId: schema.solves.userId, n: sql<number>`count(*)::int` }).from(schema.solves).groupBy(schema.solves.userId);
  const days = await db
    .select({ userId: schema.xpLedger.userId, day: sql<string>`to_char(${schema.xpLedger.createdAt} at time zone 'Asia/Taipei', 'YYYY-MM-DD')` })
    .from(schema.xpLedger)
    .where(gte(schema.xpLedger.createdAt, new Date(Date.now() - 60 * DAY)))
    .groupBy(schema.xpLedger.userId, sql`2`);

  const activeDays = new Map<string, Set<string>>();
  for (const d of days) (activeDays.get(d.userId) ?? activeDays.set(d.userId, new Set()).get(d.userId)!).add(d.day);
  const today = new Date(Date.now() + 8 * 3600_000).toISOString().slice(0, 10);
  const streakOf = (userId: string) => {
    const set = activeDays.get(userId);
    if (!set) return 0;
    let streak = 0;
    let cursor = new Date(today + "T00:00:00Z").getTime();
    if (!set.has(today)) cursor -= DAY; // a streak survives until the day is over
    while (set.has(new Date(cursor).toISOString().slice(0, 10))) {
      streak += 1;
      cursor -= DAY;
    }
    return streak;
  };

  return users
    .map<Player>((u) => ({
      id: u.id,
      handle: u.handle,
      schoolId: u.schoolId ?? "",
      xp: Number(totals.find((t) => t.userId === u.id)?.xp ?? 0),
      weeklyXp: Number(weekly.find((w) => w.userId === u.id)?.xp ?? 0),
      solves: Number(solves.find((s) => s.userId === u.id)?.n ?? 0),
      streak: streakOf(u.id),
      title: u.bio ?? undefined,
      isAssistant: u.role === "ta" || undefined,
    }))
    .filter((p) => p.xp > 0 || p.solves > 0)
    .sort((a, b) => b.xp - a.xp)
    .slice(0, 200);
}

export function schoolStandings(players: Player[]): SchoolStanding[] {
  const map = new Map<string, SchoolStanding>();
  for (const p of players) {
    if (!p.schoolId) continue;
    const cur = map.get(p.schoolId) ?? { schoolId: p.schoolId, xp: 0, members: 0, solves: 0 };
    cur.xp += p.xp;
    cur.members += 1;
    cur.solves += p.solves;
    map.set(p.schoolId, cur);
  }
  return [...map.values()].sort((a, b) => b.xp - a.xp);
}

/* ------------------------------ activity feed ------------------------------ */
export async function getRecentActivity(limit = 14): Promise<Activity[]> {
  const db = await getDb();
  const short = (schoolId: string | null) => (schoolId ? (schoolById(schoolId)?.short ?? schoolId) : "");

  const solveRows = await db
    .select({
      id: schema.solves.id,
      userId: schema.solves.userId,
      handle: schema.users.handle,
      schoolId: schema.users.schoolId,
      challengeId: schema.solves.challengeId,
      flagId: schema.solves.flagId,
      name: schema.challenges.name,
      at: schema.solves.solvedAt,
    })
    .from(schema.solves)
    .innerJoin(schema.users, eq(schema.users.id, schema.solves.userId))
    .innerJoin(schema.challenges, eq(schema.challenges.id, schema.solves.challengeId))
    .orderBy(desc(schema.solves.solvedAt))
    .limit(limit);

  // first blood = earliest solve of that flag
  const challengeIds = [...new Set(solveRows.map((s) => s.challengeId))];
  const firsts = challengeIds.length
    ? await db
        .select({ challengeId: schema.solves.challengeId, flagId: schema.solves.flagId, userId: schema.solves.userId, at: schema.solves.solvedAt })
        .from(schema.solves)
        .where(inArray(schema.solves.challengeId, challengeIds))
        .orderBy(schema.solves.solvedAt)
    : [];
  const firstBy = new Map<string, string>();
  for (const f of firsts) {
    const key = f.challengeId + "#" + f.flagId;
    if (!firstBy.has(key)) firstBy.set(key, f.userId);
  }

  const lessonRows = await db
    .select({ userId: schema.lessonProgress.userId, handle: schema.users.handle, schoolId: schema.users.schoolId, title: schema.lessons.title, at: schema.lessonProgress.completedAt })
    .from(schema.lessonProgress)
    .innerJoin(schema.users, eq(schema.users.id, schema.lessonProgress.userId))
    .innerJoin(schema.lessons, eq(schema.lessons.id, schema.lessonProgress.lessonId))
    .where(isNotNull(schema.lessonProgress.completedAt))
    .orderBy(desc(schema.lessonProgress.completedAt))
    .limit(limit);

  const releases = await db
    .select({ id: schema.challenges.id, name: schema.challenges.name, at: schema.challenges.releasedAt, author: schema.instructors.handle })
    .from(schema.challenges)
    .leftJoin(schema.instructors, eq(schema.instructors.id, schema.challenges.authorId))
    .where(and(eq(schema.challenges.status, "published"), isNotNull(schema.challenges.releasedAt)))
    .orderBy(desc(schema.challenges.releasedAt))
    .limit(3);

  const items: Activity[] = [
    ...solveRows.map<Activity>((s) => ({
      id: "s-" + s.id,
      kind: firstBy.get(s.challengeId + "#" + s.flagId) === s.userId ? "firstblood" : "solve",
      handle: s.handle,
      schoolShort: short(s.schoolId),
      target: s.name,
      at: s.at.toISOString(),
    })),
    ...lessonRows.map<Activity>((l, i) => ({ id: "l-" + i + "-" + l.userId, kind: "lesson", handle: l.handle, schoolShort: short(l.schoolId), target: l.title, at: l.at!.toISOString() })),
    ...releases.map<Activity>((r) => ({ id: "r-" + r.id, kind: "release", handle: r.author ?? "SCIST", schoolShort: "講師", target: r.name, at: r.at!.toISOString() })),
  ];
  const now = Date.now();
  return items
    .sort((a, b) => b.at.localeCompare(a.at))
    .slice(0, limit)
    .map((i) => ({ ...i, ago: relativeTime(i.at, now) }));
}

/** Latest people who solved a challenge, for the challenge page sidebar. */
export async function getRecentSolvers(challengeId: string, limit = 6) {
  const db = await getDb();
  const rows = await db
    .select({ userId: schema.solves.userId, handle: schema.users.handle, schoolId: schema.users.schoolId, at: sql<Date>`max(${schema.solves.solvedAt})` })
    .from(schema.solves)
    .innerJoin(schema.users, eq(schema.users.id, schema.solves.userId))
    .where(eq(schema.solves.challengeId, challengeId))
    .groupBy(schema.solves.userId, schema.users.handle, schema.users.schoolId)
    .orderBy(desc(sql`max(${schema.solves.solvedAt})`))
    .limit(limit);
  const now = Date.now();
  return rows.map((r) => {
    const at = new Date(r.at).toISOString();
    return { id: r.userId, handle: r.handle, schoolShort: r.schoolId ? (schoolById(r.schoolId)?.short ?? r.schoolId) : "", at, ago: relativeTime(at, now) };
  });
}
