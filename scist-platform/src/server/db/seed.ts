/**
 * Seeds a database from the demo content under src/data.
 *
 * Called by `pnpm db:seed` and, in development, automatically by getDb() when
 * the database has no tracks yet, so a fresh checkout renders real pages.
 *
 * Learner rows (progress, solves by real users, ledger) are never touched by
 * `force`; only content and the demo roster are re-imported.
 */
import { sql } from "drizzle-orm";
import * as schema from "./schema";
import type { Db } from "./index";
import { TRACKS } from "../../data/tracks";
import { CHALLENGES } from "../../data/challenges";
import { EVENTS } from "../../data/events";
import { QUESTIONS } from "../../data/questions";
import { INSTRUCTORS } from "../../data/instructors";
import { SCHOOLS } from "../../data/schools";
import { PLAYERS } from "../../data/players";
import { DEFAULT_SETTINGS } from "../../lib/settings-defaults";
import { seeded } from "../../lib/utils";

export async function isDatabaseEmpty(db: Db) {
  const [{ count }] = await db.select({ count: sql<number>`count(*)::int` }).from(schema.tracks);
  return Number(count) === 0;
}

export async function seedDatabase(db: Db, opts: { force?: boolean } = {}): Promise<{ skipped: boolean; summary: string }> {
  if (!(await isDatabaseEmpty(db)) && !opts.force) return { skipped: true, summary: "" };

  /* ---------------- people ---------------- */
  for (const [i, s] of SCHOOLS.entries()) {
    await db
      .insert(schema.schools)
      .values({ id: s.id, name: s.name, short: s.short, region: s.region, sortOrder: i })
      .onConflictDoUpdate({ target: schema.schools.id, set: { name: s.name, short: s.short, region: s.region, sortOrder: i } });
  }

  for (const [i, ins] of INSTRUCTORS.entries()) {
    const row = { id: ins.id, name: ins.name, handle: ins.handle, role: ins.role, domains: ins.domains, bio: ins.bio, creds: ins.creds, accent: ins.accent, sortOrder: i };
    await db.insert(schema.instructors).values(row).onConflictDoUpdate({ target: schema.instructors.id, set: row });
  }

  // demo roster: the leaderboard needs people on it before anyone real signs up
  for (const p of PLAYERS) {
    const u = {
      id: p.id,
      handle: p.handle,
      displayName: p.handle,
      schoolId: p.schoolId,
      role: (p.isAssistant ? "ta" : "student") as "ta" | "student",
      bio: p.title ?? null,
    };
    await db.insert(schema.users).values(u).onConflictDoUpdate({ target: schema.users.id, set: u });
  }

  /* ---------------- curriculum ---------------- */
  for (const [ti, t] of TRACKS.entries()) {
    const row = {
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
      sortOrder: ti,
      status: "published" as const,
    };
    await db.insert(schema.tracks).values(row).onConflictDoUpdate({ target: schema.tracks.id, set: row });

    for (const [mi, m] of t.modules.entries()) {
      const moduleId = t.id + "-m" + (mi + 1);
      await db
        .insert(schema.modules)
        .values({ id: moduleId, trackId: t.id, title: m.title, sortOrder: mi })
        .onConflictDoUpdate({ target: schema.modules.id, set: { title: m.title, sortOrder: mi, trackId: t.id } });

      for (const [li, l] of m.lessons.entries()) {
        const lrow = {
          id: l.id,
          trackId: t.id,
          moduleId,
          slug: l.slug,
          title: l.title,
          summary: l.summary,
          durationSec: l.durationSec,
          xp: l.xp,
          videoProvider: "none" as const,
          content: l.content,
          checkpoints: l.checkpoints,
          labSlug: l.labSlug ?? null,
          sortOrder: li,
          status: "published" as const,
          publishedAt: new Date(),
        };
        await db.insert(schema.lessons).values(lrow).onConflictDoUpdate({ target: schema.lessons.id, set: lrow });
      }
    }
  }

  /* ---------------- arena ---------------- */
  const rand = seeded(42);
  for (const c of CHALLENGES) {
    const row = {
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
      tutorial: Boolean(c.tutorial),
      lessonRef: c.lesson ?? null,
      baseSolves: c.solves,
      rating: c.rating,
      connectionType: (c.connection?.type ?? "none") as "none" | "http" | "nc" | "ssh",
      connectionValue: c.connection?.value ?? null,
      instanceTtlMin: 120,
      status: "published" as const,
      releasedAt: new Date(c.releasedAt),
    };
    await db.insert(schema.challenges).values(row).onConflictDoUpdate({ target: schema.challenges.id, set: row });

    // children are replaced wholesale
    await db.delete(schema.challengeFlags).where(sql`${schema.challengeFlags.challengeId} = ${c.id}`);
    await db.delete(schema.challengeHints).where(sql`${schema.challengeHints.challengeId} = ${c.id}`);
    await db.delete(schema.challengeFiles).where(sql`${schema.challengeFiles.challengeId} = ${c.id}`);

    for (const [i, f] of c.flags.entries()) {
      await db.insert(schema.challengeFlags).values({ id: c.id + "-" + f.id, challengeId: c.id, flagId: f.id, label: f.label, sha256: f.sha256, points: f.points, sortOrder: i });
    }
    for (const [i, h] of c.hints.entries()) {
      await db.insert(schema.challengeHints).values({ id: c.id + "-" + h.id, challengeId: c.id, sortOrder: i, text: h.text, cost: h.cost });
    }
    for (const name of c.files ?? []) {
      await db.insert(schema.challengeFiles).values({ challengeId: c.id, name });
    }

    // first blood becomes a real solve row; a few more demo solves keep the
    // "recent solvers" list alive
    const fbUser = c.firstBlood ? PLAYERS.find((p) => p.handle === c.firstBlood?.handle) : undefined;
    const solvers = new Set<string>();
    if (fbUser) solvers.add(fbUser.id);
    const extra = 3 + Math.floor(rand() * 3);
    while (solvers.size < Math.min(extra + (fbUser ? 1 : 0), 6)) {
      solvers.add(PLAYERS[Math.floor(rand() * PLAYERS.length)].id);
    }
    const released = new Date(c.releasedAt).getTime();
    let k = 0;
    for (const userId of solvers) {
      const isFb = fbUser && userId === fbUser.id;
      const when = isFb && c.firstBlood ? new Date(c.firstBlood.time) : new Date(released + 3600_000 * (6 + k * 19 + rand() * 40));
      k++;
      for (const f of c.flags) {
        await db
          .insert(schema.solves)
          .values({ id: c.id + "-" + userId + "-" + f.id, userId, challengeId: c.id, flagId: f.id, solvedAt: when })
          .onConflictDoNothing();
      }
    }
  }

  /* ---------------- community ---------------- */
  for (const e of EVENTS) {
    const row = {
      id: e.id,
      type: e.type,
      title: e.title,
      summary: e.summary,
      startsAt: new Date(e.startsAt),
      durationMin: e.durationMin,
      mode: (e.mode === "線上" ? "online" : "offline") as "online" | "offline",
      location: e.location,
      hostId: e.hostId,
      capacity: e.capacity,
      baseRegistered: e.registered,
      tags: e.tags,
      status: "published" as const,
    };
    await db.insert(schema.events).values(row).onConflictDoUpdate({ target: schema.events.id, set: row });
  }

  for (const q of QUESTIONS) {
    const author = PLAYERS.find((p) => p.handle === q.author);
    const qrow = {
      id: q.id,
      scope: q.scope,
      refId: q.refId,
      title: q.title,
      body: q.body,
      authorId: author?.id ?? null,
      authorHandle: q.author,
      votes: q.votes,
      createdAt: new Date(q.createdAt),
    };
    await db.insert(schema.questions).values(qrow).onConflictDoUpdate({ target: schema.questions.id, set: qrow });
    await db.delete(schema.answers).where(sql`${schema.answers.questionId} = ${q.id}`);
    let accepted: string | null = null;
    for (const a of q.answers) {
      const au = PLAYERS.find((p) => p.handle === a.author);
      await db.insert(schema.answers).values({
        id: a.id,
        questionId: q.id,
        authorId: au?.id ?? null,
        authorHandle: a.author,
        authorRole: a.role,
        body: a.body,
        votes: a.votes,
        createdAt: new Date(a.createdAt),
      });
      if (a.accepted) accepted = a.id;
    }
    if (accepted) {
      await db.update(schema.questions).set({ acceptedAnswerId: accepted }).where(sql`${schema.questions.id} = ${q.id}`);
    }
  }

  /* ---------------- demo XP ---------------- */
  // two ledger rows per demo player: an older lump and a "this week" lump so the
  // weekly board has something to show. Seed rows are tagged so they can be
  // recognised and removed later.
  const now = Date.now();
  for (const p of PLAYERS) {
    await db.delete(schema.xpLedger).where(sql`${schema.xpLedger.userId} = ${p.id} and ${schema.xpLedger.reason} = 'admin'`);
    await db.insert(schema.xpLedger).values([
      { id: p.id + "-seed-old", userId: p.id, delta: p.xp - p.weeklyXp, reason: "admin", label: "示範資料（累計）", createdAt: new Date(now - 9 * 86400_000) },
      { id: p.id + "-seed-week", userId: p.id, delta: p.weeklyXp, reason: "admin", label: "示範資料（本週）", createdAt: new Date(now - 1 * 86400_000) },
    ]);
  }

  /* ---------------- settings ---------------- */
  for (const [key, value] of Object.entries(DEFAULT_SETTINGS)) {
    await db.insert(schema.settings).values({ key, value }).onConflictDoNothing();
  }

  const summary = [
    SCHOOLS.length + " schools",
    INSTRUCTORS.length + " instructors",
    PLAYERS.length + " demo users",
    TRACKS.length + " tracks",
    TRACKS.reduce((n, t) => n + t.modules.reduce((m, x) => m + x.lessons.length, 0), 0) + " lessons",
    CHALLENGES.length + " challenges",
    EVENTS.length + " events",
    QUESTIONS.length + " questions",
  ].join(", ");
  return { skipped: false, summary };
}
