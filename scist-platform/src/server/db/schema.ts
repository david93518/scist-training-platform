/**
 * SCIST Gate — database schema (Postgres via Drizzle).
 *
 * Content (tracks → modules → lessons, challenges, events) is authored in the
 * admin console. Learner state (progress, solves, XP ledger) is written by the
 * public API. Everything the old mock data expressed lives here now; the files
 * under src/data are only used to seed a fresh database.
 */
import { relations, sql } from "drizzle-orm";
import {
  boolean,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  primaryKey,
  real,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { nanoid } from "nanoid";
import type { ContentBlock, Checkpoint } from "../../data/tracks";

/* ------------------------------ enums ------------------------------ */
export const userRole = pgEnum("user_role", ["student", "ta", "instructor", "admin"]);
export const contentStatus = pgEnum("content_status", ["draft", "published", "archived"]);
export const videoProvider = pgEnum("video_provider", ["none", "youtube", "stream"]);
export const videoStatus = pgEnum("video_status", ["none", "uploading", "processing", "ready", "error"]);
export const difficulty = pgEnum("difficulty", ["easy", "medium", "hard", "insane"]);
export const category = pgEnum("category", ["web", "crypto", "reverse", "pwn", "linux", "misc"]);
export const challengeKind = pgEnum("challenge_kind", ["challenge", "box"]);
export const connectionType = pgEnum("connection_type", ["none", "http", "nc", "ssh"]);
export const eventType = pgEnum("event_type", ["clinic", "live", "contest", "workshop"]);
export const eventMode = pgEnum("event_mode", ["online", "offline"]);
export const xpReason = pgEnum("xp_reason", ["checkpoint", "lesson", "solve", "hint", "event", "admin"]);
export const questionScope = pgEnum("question_scope", ["lesson", "challenge"]);
export const instanceStatus = pgEnum("instance_status", ["starting", "running", "stopped", "error"]);

const id = () => text("id").primaryKey().$defaultFn(() => nanoid(12));
const createdAt = () => timestamp("created_at", { withTimezone: true }).defaultNow().notNull();
const updatedAt = () =>
  timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .notNull()
    .$onUpdate(() => new Date());

/* ------------------------------ people ------------------------------ */
export const schools = pgTable("schools", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  short: text("short").notNull(),
  region: text("region").notNull(),
  sortOrder: integer("sort_order").notNull().default(0),
});

export const users = pgTable(
  "users",
  {
    id: id(),
    discordId: text("discord_id"),
    handle: text("handle").notNull(),
    displayName: text("display_name"),
    avatarUrl: text("avatar_url"),
    email: text("email"),
    role: userRole("role").notNull().default("student"),
    schoolId: text("school_id").references(() => schools.id, { onDelete: "set null" }),
    bio: text("bio"),
    createdAt: createdAt(),
    lastSeenAt: timestamp("last_seen_at", { withTimezone: true }),
    bannedAt: timestamp("banned_at", { withTimezone: true }),
  },
  (t) => [
    uniqueIndex("users_handle_idx").on(t.handle),
    uniqueIndex("users_discord_idx").on(t.discordId),
  ],
);

export const instructors = pgTable("instructors", {
  id: text("id").primaryKey(),
  userId: text("user_id").references(() => users.id, { onDelete: "set null" }),
  name: text("name").notNull(),
  handle: text("handle").notNull(),
  role: text("role").notNull(),
  domains: jsonb("domains").$type<string[]>().notNull().default([]),
  bio: text("bio").notNull().default(""),
  creds: jsonb("creds").$type<string[]>().notNull().default([]),
  accent: text("accent").notNull().default("#a4f13b"),
  sortOrder: integer("sort_order").notNull().default(0),
});

/* ------------------------------ curriculum ------------------------------ */
export const tracks = pgTable(
  "tracks",
  {
    id: text("id").primaryKey(),
    slug: text("slug").notNull(),
    name: text("name").notNull(),
    en: text("en").notNull(),
    tagline: text("tagline").notNull().default(""),
    icon: text("icon").notNull().default("Puzzle"),
    color: text("color").notNull().default("#a4f13b"),
    level: text("level").notNull().default("入門友善"),
    difficulty: difficulty("difficulty").notNull().default("easy"),
    outcome: text("outcome").notNull().default(""),
    syllabus: jsonb("syllabus").$type<string[]>().notNull().default([]),
    instructorId: text("instructor_id").references(() => instructors.id, { onDelete: "set null" }),
    sortOrder: integer("sort_order").notNull().default(0),
    status: contentStatus("status").notNull().default("published"),
    updatedAt: updatedAt(),
  },
  (t) => [uniqueIndex("tracks_slug_idx").on(t.slug)],
);

export const modules = pgTable(
  "modules",
  {
    id: id(),
    trackId: text("track_id")
      .notNull()
      .references(() => tracks.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    sortOrder: integer("sort_order").notNull().default(0),
  },
  (t) => [index("modules_track_idx").on(t.trackId)],
);

export const lessons = pgTable(
  "lessons",
  {
    id: text("id").primaryKey().$defaultFn(() => nanoid(12)),
    trackId: text("track_id")
      .notNull()
      .references(() => tracks.id, { onDelete: "cascade" }),
    moduleId: text("module_id")
      .notNull()
      .references(() => modules.id, { onDelete: "cascade" }),
    slug: text("slug").notNull(),
    title: text("title").notNull(),
    summary: text("summary").notNull().default(""),
    durationSec: integer("duration_sec").notNull().default(600),
    xp: integer("xp").notNull().default(60),
    videoProvider: videoProvider("video_provider").notNull().default("none"),
    videoId: text("video_id"),
    videoStatus: videoStatus("video_status").notNull().default("none"),
    thumbnailUrl: text("thumbnail_url"),
    content: jsonb("content").$type<ContentBlock[]>().notNull().default([]),
    checkpoints: jsonb("checkpoints").$type<Checkpoint[]>().notNull().default([]),
    labSlug: text("lab_slug"),
    sortOrder: integer("sort_order").notNull().default(0),
    status: contentStatus("status").notNull().default("draft"),
    publishedAt: timestamp("published_at", { withTimezone: true }),
    createdBy: text("created_by").references(() => users.id, { onDelete: "set null" }),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    uniqueIndex("lessons_track_slug_idx").on(t.trackId, t.slug),
    index("lessons_module_idx").on(t.moduleId),
  ],
);

/* ------------------------------ arena ------------------------------ */
export const challenges = pgTable(
  "challenges",
  {
    id: text("id").primaryKey().$defaultFn(() => nanoid(12)),
    slug: text("slug").notNull(),
    name: text("name").notNull(),
    category: category("category").notNull().default("misc"),
    difficulty: difficulty("difficulty").notNull().default("easy"),
    kind: challengeKind("kind").notNull().default("challenge"),
    blurb: text("blurb").notNull().default(""),
    description: jsonb("description").$type<string[]>().notNull().default([]),
    tags: jsonb("tags").$type<string[]>().notNull().default([]),
    authorId: text("author_id").references(() => instructors.id, { onDelete: "set null" }),
    tutorial: boolean("tutorial").notNull().default(false),
    lessonRef: text("lesson_ref"),
    /** seed-time social proof, added to the real solve count */
    baseSolves: integer("base_solves").notNull().default(0),
    rating: real("rating").notNull().default(0),
    connectionType: connectionType("connection_type").notNull().default("none"),
    connectionValue: text("connection_value"),
    instanceImage: text("instance_image"),
    instancePort: integer("instance_port"),
    instanceTtlMin: integer("instance_ttl_min").notNull().default(120),
    status: contentStatus("status").notNull().default("draft"),
    releasedAt: timestamp("released_at", { withTimezone: true }),
    createdBy: text("created_by").references(() => users.id, { onDelete: "set null" }),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [uniqueIndex("challenges_slug_idx").on(t.slug), index("challenges_status_idx").on(t.status)],
);

export const challengeFlags = pgTable(
  "challenge_flags",
  {
    id: id(),
    challengeId: text("challenge_id")
      .notNull()
      .references(() => challenges.id, { onDelete: "cascade" }),
    /** "flag" for single-flag challenges, "user" / "root" for boxes */
    flagId: text("flag_id").notNull().default("flag"),
    label: text("label").notNull().default("Flag"),
    sha256: text("sha256").notNull(),
    points: integer("points").notNull().default(100),
    sortOrder: integer("sort_order").notNull().default(0),
  },
  (t) => [uniqueIndex("challenge_flags_idx").on(t.challengeId, t.flagId)],
);

export const challengeHints = pgTable(
  "challenge_hints",
  {
    id: id(),
    challengeId: text("challenge_id")
      .notNull()
      .references(() => challenges.id, { onDelete: "cascade" }),
    sortOrder: integer("sort_order").notNull().default(0),
    text: text("text").notNull(),
    cost: integer("cost").notNull().default(10),
  },
  (t) => [index("challenge_hints_idx").on(t.challengeId)],
);

export const challengeFiles = pgTable(
  "challenge_files",
  {
    id: id(),
    challengeId: text("challenge_id")
      .notNull()
      .references(() => challenges.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    /** object key in R2; null when the file is only listed, not uploaded yet */
    objectKey: text("object_key"),
    size: integer("size"),
    contentType: text("content_type"),
    createdAt: createdAt(),
  },
  (t) => [index("challenge_files_idx").on(t.challengeId)],
);

/* ------------------------------ community ------------------------------ */
export const events = pgTable("events", {
  id: id(),
  type: eventType("type").notNull().default("live"),
  title: text("title").notNull(),
  summary: text("summary").notNull().default(""),
  startsAt: timestamp("starts_at", { withTimezone: true }).notNull(),
  durationMin: integer("duration_min").notNull().default(90),
  mode: eventMode("mode").notNull().default("online"),
  location: text("location").notNull().default(""),
  hostId: text("host_id").references(() => instructors.id, { onDelete: "set null" }),
  capacity: integer("capacity").notNull().default(100),
  /** seed value shown in addition to real registrations */
  baseRegistered: integer("base_registered").notNull().default(0),
  tags: jsonb("tags").$type<string[]>().notNull().default([]),
  status: contentStatus("status").notNull().default("published"),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});

export const eventRegistrations = pgTable(
  "event_registrations",
  {
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    eventId: text("event_id")
      .notNull()
      .references(() => events.id, { onDelete: "cascade" }),
    createdAt: createdAt(),
  },
  (t) => [primaryKey({ columns: [t.userId, t.eventId] })],
);

export const questions = pgTable(
  "questions",
  {
    id: id(),
    scope: questionScope("scope").notNull(),
    /** "track/lesson" for lessons, challenge slug for challenges */
    refId: text("ref_id").notNull(),
    title: text("title").notNull(),
    body: text("body").notNull().default(""),
    authorId: text("author_id").references(() => users.id, { onDelete: "set null" }),
    /** display name kept so seeded questions render without a user row */
    authorHandle: text("author_handle").notNull(),
    votes: integer("votes").notNull().default(0),
    acceptedAnswerId: text("accepted_answer_id"),
    createdAt: createdAt(),
  },
  (t) => [index("questions_ref_idx").on(t.scope, t.refId)],
);

export const answers = pgTable(
  "answers",
  {
    id: id(),
    questionId: text("question_id")
      .notNull()
      .references(() => questions.id, { onDelete: "cascade" }),
    authorId: text("author_id").references(() => users.id, { onDelete: "set null" }),
    authorHandle: text("author_handle").notNull(),
    authorRole: text("author_role").notNull().default("學員"),
    body: text("body").notNull(),
    votes: integer("votes").notNull().default(0),
    createdAt: createdAt(),
  },
  (t) => [index("answers_question_idx").on(t.questionId)],
);

/**
 * One row per person per target. The denormalised `votes` column above stays
 * the number on screen (it also carries the seeded counts); these tables only
 * exist so the same person cannot vote twice.
 */
export const questionVotes = pgTable(
  "question_votes",
  {
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    questionId: text("question_id")
      .notNull()
      .references(() => questions.id, { onDelete: "cascade" }),
    createdAt: createdAt(),
  },
  (t) => [primaryKey({ columns: [t.userId, t.questionId] })],
);

export const answerVotes = pgTable(
  "answer_votes",
  {
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    answerId: text("answer_id")
      .notNull()
      .references(() => answers.id, { onDelete: "cascade" }),
    createdAt: createdAt(),
  },
  (t) => [primaryKey({ columns: [t.userId, t.answerId] })],
);

/* ------------------------------ learner state ------------------------------ */
export const lessonProgress = pgTable(
  "lesson_progress",
  {
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    lessonId: text("lesson_id")
      .notNull()
      .references(() => lessons.id, { onDelete: "cascade" }),
    watched: real("watched").notNull().default(0),
    checkpointsDone: jsonb("checkpoints_done").$type<number[]>().notNull().default([]),
    note: text("note").notNull().default(""),
    completedAt: timestamp("completed_at", { withTimezone: true }),
    updatedAt: updatedAt(),
  },
  (t) => [primaryKey({ columns: [t.userId, t.lessonId] })],
);

export const solves = pgTable(
  "solves",
  {
    id: id(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    challengeId: text("challenge_id")
      .notNull()
      .references(() => challenges.id, { onDelete: "cascade" }),
    flagId: text("flag_id").notNull(),
    solvedAt: createdAt(),
  },
  (t) => [
    uniqueIndex("solves_unique_idx").on(t.userId, t.challengeId, t.flagId),
    index("solves_challenge_idx").on(t.challengeId, t.solvedAt),
  ],
);

export const attempts = pgTable(
  "attempts",
  {
    id: id(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    challengeId: text("challenge_id")
      .notNull()
      .references(() => challenges.id, { onDelete: "cascade" }),
    /** hash only; wrong guesses are never stored in plaintext */
    submissionSha256: text("submission_sha256").notNull(),
    correct: boolean("correct").notNull(),
    createdAt: createdAt(),
  },
  (t) => [index("attempts_user_idx").on(t.userId, t.challengeId, t.createdAt)],
);

export const hintUnlocks = pgTable(
  "hint_unlocks",
  {
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    hintId: text("hint_id")
      .notNull()
      .references(() => challengeHints.id, { onDelete: "cascade" }),
    createdAt: createdAt(),
  },
  (t) => [primaryKey({ columns: [t.userId, t.hintId] })],
);

export const xpLedger = pgTable(
  "xp_ledger",
  {
    id: id(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    delta: integer("delta").notNull(),
    reason: xpReason("reason").notNull(),
    refId: text("ref_id"),
    label: text("label").notNull().default(""),
    createdAt: createdAt(),
  },
  (t) => [index("xp_user_idx").on(t.userId, t.createdAt), index("xp_created_idx").on(t.createdAt)],
);

export const instances = pgTable(
  "instances",
  {
    id: id(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    challengeId: text("challenge_id")
      .notNull()
      .references(() => challenges.id, { onDelete: "cascade" }),
    externalId: text("external_id"),
    host: text("host"),
    port: integer("port"),
    status: instanceStatus("status").notNull().default("starting"),
    createdAt: createdAt(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  },
  (t) => [index("instances_user_idx").on(t.userId, t.status)],
);

/* ------------------------------ ops ------------------------------ */
export const settings = pgTable("settings", {
  key: text("key").primaryKey(),
  value: jsonb("value").$type<unknown>().notNull(),
  updatedAt: updatedAt(),
  updatedBy: text("updated_by"),
});

export const auditLog = pgTable(
  "audit_log",
  {
    id: id(),
    actorId: text("actor_id"),
    action: text("action").notNull(),
    entity: text("entity").notNull(),
    entityId: text("entity_id"),
    detail: jsonb("detail").$type<unknown>(),
    createdAt: createdAt(),
  },
  (t) => [index("audit_created_idx").on(t.createdAt)],
);

/* ------------------------------ relations ------------------------------ */
export const tracksRelations = relations(tracks, ({ many, one }) => ({
  modules: many(modules),
  lessons: many(lessons),
  instructor: one(instructors, { fields: [tracks.instructorId], references: [instructors.id] }),
}));
export const modulesRelations = relations(modules, ({ one, many }) => ({
  track: one(tracks, { fields: [modules.trackId], references: [tracks.id] }),
  lessons: many(lessons),
}));
export const lessonsRelations = relations(lessons, ({ one }) => ({
  track: one(tracks, { fields: [lessons.trackId], references: [tracks.id] }),
  module: one(modules, { fields: [lessons.moduleId], references: [modules.id] }),
}));
export const challengesRelations = relations(challenges, ({ many, one }) => ({
  flags: many(challengeFlags),
  hints: many(challengeHints),
  files: many(challengeFiles),
  author: one(instructors, { fields: [challenges.authorId], references: [instructors.id] }),
}));
export const challengeFlagsRelations = relations(challengeFlags, ({ one }) => ({
  challenge: one(challenges, { fields: [challengeFlags.challengeId], references: [challenges.id] }),
}));
export const challengeHintsRelations = relations(challengeHints, ({ one }) => ({
  challenge: one(challenges, { fields: [challengeHints.challengeId], references: [challenges.id] }),
}));
export const challengeFilesRelations = relations(challengeFiles, ({ one }) => ({
  challenge: one(challenges, { fields: [challengeFiles.challengeId], references: [challenges.id] }),
}));
export const questionsRelations = relations(questions, ({ many }) => ({
  answers: many(answers),
}));
export const answersRelations = relations(answers, ({ one }) => ({
  question: one(questions, { fields: [answers.questionId], references: [questions.id] }),
}));
export const usersRelations = relations(users, ({ one }) => ({
  school: one(schools, { fields: [users.schoolId], references: [schools.id] }),
}));
export const eventsRelations = relations(events, ({ one, many }) => ({
  host: one(instructors, { fields: [events.hostId], references: [instructors.id] }),
  registrations: many(eventRegistrations),
}));
export const eventRegistrationsRelations = relations(eventRegistrations, ({ one }) => ({
  event: one(events, { fields: [eventRegistrations.eventId], references: [events.id] }),
  user: one(users, { fields: [eventRegistrations.userId], references: [users.id] }),
}));

/* ------------------------------ helpers ------------------------------ */
export const nowSql = sql`now()`;

export type User = typeof users.$inferSelect;
export type Track = typeof tracks.$inferSelect;
export type Module = typeof modules.$inferSelect;
export type Lesson = typeof lessons.$inferSelect;
export type Challenge = typeof challenges.$inferSelect;
export type ChallengeFlag = typeof challengeFlags.$inferSelect;
export type ChallengeHint = typeof challengeHints.$inferSelect;
export type ChallengeFile = typeof challengeFiles.$inferSelect;
export type SciEvent = typeof events.$inferSelect;
export type Question = typeof questions.$inferSelect;
export type Answer = typeof answers.$inferSelect;
export type Instructor = typeof instructors.$inferSelect;
export type School = typeof schools.$inferSelect;
