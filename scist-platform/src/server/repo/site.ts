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
import { notifyDiscord, weeklyReportMessage } from "../services/discord";
import { cached, invalidate, TTL } from "../cache";
import { addCalendarDays, calendarDate, weekStart } from "@/lib/timezone";
import { relativeTime } from "@/lib/utils";

const DAY = 86400_000;

/* ------------------------------ instructors ------------------------------ */
export function getInstructorsPublic(): Promise<Instructor[]> {
  return cached("site:instructors", TTL.content, loadInstructorsPublic);
}

async function loadInstructorsPublic(): Promise<Instructor[]> {
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

export function getSiteStats(): Promise<SiteStats> {
  return cached("site:stats", TTL.stats, loadSiteStats);
}

async function loadSiteStats(): Promise<SiteStats> {
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
/** Everyone with XP, all-time and this week, in the Player shape the boards render. */
export function getPlayersPublic(weekStartsOn = 0): Promise<Player[]> {
  return cached("site:players:" + weekStartsOn, TTL.stats, () => loadPlayersPublic(weekStartsOn));
}

async function loadPlayersPublic(weekStartsOn: number): Promise<Player[]> {
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
  const today = calendarDate();
  const streakOf = (userId: string) => {
    const set = activeDays.get(userId);
    if (!set) return 0;
    let streak = 0;
    // 今天還沒活動的話，連到昨天仍算連續，給到當天結束
    let cursor = set.has(today) ? today : addCalendarDays(today, -1);
    while (set.has(cursor)) {
      streak += 1;
      cursor = addCalendarDays(cursor, -1);
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
export function getRecentActivity(limit = 14): Promise<Activity[]> {
  return cached("site:activity:" + limit, TTL.stats, () => loadRecentActivity(limit));
}

async function loadRecentActivity(limit: number): Promise<Activity[]> {
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

/* ------------------------------ weekly challenge ------------------------------ */
export interface WeeklyChallenge {
  slug: string;
  name: string;
  category: string;
  difficulty: string;
  points: number;
  note: string;
  bonusXp: number;
  /** 台北時區的本週起訖，用來寫「到 x/y 截止」 */
  from: string;
  until: string;
  /** 這一週最早解出來的人，前三名 */
  top: { rank: number; handle: string; schoolShort: string; at: string }[];
  solversThisWeek: number;
}

/**
 * 本週指定挑戰。名次照「這一週第一次解出的時間」排，所以上週就解掉的人
 * 不會佔著前三名；沒設定 slug 或那題已下架就回 null，呼叫端直接不渲染。
 */
export function getWeeklyChallenge(
  weekly: { slug: string; note: string; bonusXp: number },
  weekStartsOn = 0,
): Promise<WeeklyChallenge | null> {
  if (!weekly.slug) return Promise.resolve(null);
  // 文案改了要立刻看到，所以 note 與 bonusXp 也進 key
  const key = ["site:weekly", weekly.slug, weekStartsOn, weekly.bonusXp, weekly.note].join("|");
  return cached(key, TTL.stats, () => loadWeeklyChallenge(weekly, weekStartsOn));
}

async function loadWeeklyChallenge(
  weekly: { slug: string; note: string; bonusXp: number },
  weekStartsOn: number,
): Promise<WeeklyChallenge | null> {
  const db = await getDb();

  const [challenge] = await db
    .select({
      id: schema.challenges.id,
      slug: schema.challenges.slug,
      name: schema.challenges.name,
      category: schema.challenges.category,
      difficulty: schema.challenges.difficulty,
    })
    .from(schema.challenges)
    .where(and(eq(schema.challenges.slug, weekly.slug), eq(schema.challenges.status, "published")));
  if (!challenge) return null;

  const from = weekStart(weekStartsOn);
  const until = new Date(from.getTime() + 7 * DAY);

  const points = await db
    .select({ n: sql<number>`coalesce(sum(${schema.challengeFlags.points}), 0)::int` })
    .from(schema.challengeFlags)
    .where(eq(schema.challengeFlags.challengeId, challenge.id));

  const rows = await db
    .select({
      userId: schema.solves.userId,
      handle: schema.users.handle,
      schoolId: schema.users.schoolId,
      at: sql<Date>`min(${schema.solves.solvedAt})`,
    })
    .from(schema.solves)
    .innerJoin(schema.users, eq(schema.users.id, schema.solves.userId))
    .where(and(eq(schema.solves.challengeId, challenge.id), gte(schema.solves.solvedAt, from), isNull(schema.users.bannedAt)))
    .groupBy(schema.solves.userId, schema.users.handle, schema.users.schoolId)
    .orderBy(sql`min(${schema.solves.solvedAt})`);

  return {
    slug: challenge.slug,
    name: challenge.name,
    category: challenge.category,
    difficulty: challenge.difficulty,
    points: Number(points[0]?.n ?? 0),
    note: weekly.note,
    bonusXp: weekly.bonusXp,
    from: from.toISOString(),
    until: until.toISOString(),
    solversThisWeek: rows.length,
    top: rows.slice(0, 3).map((r, i) => ({
      rank: i + 1,
      handle: r.handle,
      schoolShort: r.schoolId ? (schoolById(r.schoolId)?.short ?? r.schoolId) : "",
      at: new Date(r.at).toISOString(),
    })),
  };
}

/**
 * 週結算：發前三名的加分並貼 Discord 戰報。
 *
 * 加分走 xp_ledger，label 帶週起日，所以同一週按兩次不會重複發：先查有沒有
 * 同一個 label 的紀錄。沒設 slug 或沒人解出時只回報，不寫任何 XP。
 */
export async function settleWeeklyChallenge(
  weekly: { slug: string; note: string; bonusXp: number },
  weekStartsOn: number,
  siteUrl: string,
): Promise<{ ok: boolean; message: string; awarded: number; posted: boolean }> {
  const w = await getWeeklyChallenge(weekly, weekStartsOn);
  if (!w) return { ok: false, message: "沒有設定本週挑戰，或那一題已下架。", awarded: 0, posted: false };

  const db = await getDb();
  const label = "本週挑戰 " + w.slug + " " + w.from.slice(0, 10);
  const url = siteUrl + "/challenges/" + w.slug;

  let awarded = 0;
  if (w.bonusXp > 0 && w.top.length) {
    // 用 handle 反查得獎人，靠的是 schema 上的 users_handle_idx（unique）
    const handles = w.top.map((t) => t.handle);
    const winners = await db
      .select({ id: schema.users.id, handle: schema.users.handle })
      .from(schema.users)
      .where(inArray(schema.users.handle, handles));
    const already = await db
      .select({ userId: schema.xpLedger.userId })
      .from(schema.xpLedger)
      .where(and(eq(schema.xpLedger.label, label), inArray(schema.xpLedger.userId, winners.map((u) => u.id))));
    const paid = new Set(already.map((a) => a.userId));

    const rows = winners
      .filter((u) => !paid.has(u.id))
      .map((u) => ({ userId: u.id, delta: weekly.bonusXp, reason: "event" as const, refId: w.slug, label }));
    if (rows.length) await db.insert(schema.xpLedger).values(rows);
    awarded = rows.length;
  }

  const report = weeklyReportMessage({ ...w, url });
  const posted = await notifyDiscord(report.content, report.embeds);
  if (awarded) invalidate("site:"); // 加分改了排行榜與首頁數字

  return {
    ok: true,
    awarded,
    posted,
    message:
      "已結算「" +
      w.name +
      "」：本週 " +
      w.solversThisWeek +
      " 人解出，發出 " +
      awarded +
      " 筆加分" +
      (posted ? "，Discord 已公告。" : "。未設定 DISCORD_WEBHOOK_URL，沒有公告。"),
  };
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
