/**
 * Request validation for the API. Shapes match src/admin/types.ts.
 */
import { z } from "zod";

export const statusSchema = z.enum(["draft", "published", "archived"]);
export const roleSchema = z.enum(["student", "ta", "instructor", "admin"]);
export const difficultySchema = z.enum(["easy", "medium", "hard", "insane"]);
export const categorySchema = z.enum(["web", "crypto", "reverse", "pwn", "linux", "misc"]);

const id = z.string().min(1).max(64);
const slug = z
  .string()
  .min(1)
  .max(64)
  .regex(/^[a-z0-9-]+$/, "slug may contain a-z, 0-9 and dashes only");

export const contentBlockSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("p"), text: z.string().max(5000) }),
  z.object({ type: z.literal("h"), text: z.string().max(200) }),
  z.object({ type: z.literal("code"), lang: z.string().max(20), lines: z.array(z.string().max(500)).max(400) }),
  z.object({ type: z.literal("list"), items: z.array(z.string().max(500)).max(50) }),
  z.object({ type: z.literal("callout"), tone: z.enum(["tip", "warn", "info"]), text: z.string().max(2000) }),
]);

export const checkpointSchema = z.object({
  at: z.number().min(0).max(36000),
  question: z.string().min(1).max(500),
  options: z.array(z.string().max(300)).min(2).max(6),
  answer: z.number().int().min(0).max(5),
  explain: z.string().max(2000),
  xp: z.number().int().min(0).max(500),
});

export const trackSchema = z.object({
  id,
  slug,
  name: z.string().min(1).max(60),
  en: z.string().min(1).max(60),
  tagline: z.string().max(200),
  icon: z.string().max(40),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/),
  level: z.string().max(20),
  difficulty: difficultySchema,
  outcome: z.string().max(200),
  syllabus: z.array(z.string().max(60)).max(20),
  instructorId: z.string().nullable(),
  sortOrder: z.number().int(),
  status: statusSchema,
  modules: z.array(z.object({ id, title: z.string().min(1).max(100), sortOrder: z.number().int() })).max(50),
});

export const lessonSchema = z.object({
  id,
  trackId: id,
  moduleId: id,
  slug,
  title: z.string().min(1).max(200),
  summary: z.string().max(1000),
  durationSec: z.number().int().min(0).max(36000),
  xp: z.number().int().min(0).max(5000),
  videoProvider: z.enum(["none", "youtube", "stream"]),
  videoId: z.string().max(200).nullable(),
  videoStatus: z.enum(["none", "uploading", "processing", "ready", "error"]),
  content: z.array(contentBlockSchema).max(200),
  checkpoints: z.array(checkpointSchema).max(20),
  labSlug: z.string().nullable(),
  sortOrder: z.number().int(),
  status: statusSchema,
  updatedAt: z.string().optional(),
});

export const challengeSchema = z.object({
  id,
  slug,
  name: z.string().min(1).max(120),
  category: categorySchema,
  difficulty: difficultySchema,
  kind: z.enum(["challenge", "box"]),
  blurb: z.string().max(300),
  description: z.array(z.string().max(4000)).max(50),
  tags: z.array(z.string().max(40)).max(20),
  authorId: z.string().nullable(),
  tutorial: z.boolean(),
  lessonRef: z.string().max(200).nullable(),
  connectionType: z.enum(["none", "http", "nc", "ssh"]),
  connectionValue: z.string().max(300).nullable(),
  instanceImage: z.string().max(300).nullable(),
  instancePort: z.number().int().min(1).max(65535).nullable(),
  instanceTtlMin: z.number().int().min(5).max(1440),
  baseSolves: z.number().int().min(0),
  rating: z.number().min(0).max(5),
  status: statusSchema,
  releasedAt: z.string().nullable(),
  flags: z
    .array(
      z.object({
        id,
        flagId: z.string().min(1).max(20),
        label: z.string().min(1).max(60),
        sha256: z.string().regex(/^[0-9a-f]{64}$|^$/),
        points: z.number().int().min(0).max(5000),
        plaintext: z.string().max(500).optional(),
      }),
    )
    .min(1)
    .max(10),
  hints: z.array(z.object({ id, text: z.string().max(2000), cost: z.number().int().min(0).max(1000) })).max(20),
  files: z
    .array(
      z.object({
        id,
        name: z.string().min(1).max(200),
        size: z.number().int().nullable(),
        objectKey: z.string().max(400).nullable(),
        status: z.enum(["listed", "uploading", "ready"]),
      }),
    )
    .max(30),
  updatedAt: z.string().optional(),
});

export const eventSchema = z.object({
  id,
  type: z.enum(["clinic", "live", "contest", "workshop"]),
  title: z.string().min(1).max(200),
  summary: z.string().max(2000),
  startsAt: z.string(),
  durationMin: z.number().int().min(15).max(1440),
  mode: z.enum(["online", "offline"]),
  location: z.string().max(200),
  hostId: z.string().nullable(),
  capacity: z.number().int().min(1).max(10000),
  baseRegistered: z.number().int().min(0),
  tags: z.array(z.string().max(40)).max(20),
  status: statusSchema,
});

export const settingsSchema = z.object({
  site: z.object({ name: z.string().max(60), tagline: z.string().max(120), discordInvite: z.string().max(200), launch: z.string().max(40) }),
  ranks: z.array(z.object({ id: z.string(), name: z.string().max(20), en: z.string().max(30), minXp: z.number().int().min(0), color: z.string(), blurb: z.string().max(80) })).max(12),
  certifications: z
    .array(
      z.object({
        id: z.string(),
        name: z.string().max(20),
        en: z.string().max(30),
        color: z.string(),
        blurb: z.string().max(120),
        goal: z.string().max(120),
        requires: z.object({
          tracks: z.array(slug).max(20).optional(),
          trackCount: z.number().int().min(0).max(50).optional(),
          lessons: z.number().int().min(0).max(1000).optional(),
          solves: z.number().int().min(0).max(1000).optional(),
          role: z.enum(["student", "ta", "instructor", "admin"]).optional(),
        }),
      }),
    )
    .max(10),
  xp: z.object({ checkpointDefault: z.number().int().min(0), lessonDefault: z.number().int().min(0), hintRefundOnSolve: z.boolean() }),
  leaderboard: z.object({ weekStartsOn: z.number().int().min(0).max(6) }),
  weekly: z.object({ slug: z.union([slug, z.literal("")]), note: z.string().max(300), bonusXp: z.number().int().min(0).max(5000) }),
  features: z.object({ guestProgress: z.boolean(), instances: z.boolean(), questions: z.boolean() }),
});

export const progressSchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("watched"), track: slug, lesson: slug, value: z.number().min(0).max(1) }),
  z.object({ action: z.literal("checkpoint"), track: slug, lesson: slug, index: z.number().int().min(0).max(50) }),
  z.object({ action: z.literal("complete"), track: slug, lesson: slug }),
  z.object({ action: z.literal("note"), track: slug, lesson: slug, note: z.string().max(20000) }),
]);

export const attemptSchema = z.object({ flag: z.string().min(1).max(500) });
export const hintUnlockSchema = z.object({ hintId: id });
export const questionCreateSchema = z.object({ scope: z.enum(["lesson", "challenge"]), refId: z.string().min(1).max(200), title: z.string().min(1).max(200), body: z.string().max(4000) });
export const answerCreateSchema = z.object({ body: z.string().min(1).max(4000) });
export const registerSchema = z.object({ on: z.boolean() });
export const passwordLoginSchema = z.object({
  handle: z.string().min(1).max(32),
  password: z.string().min(1).max(128),
});
export const passwordRegisterSchema = z.object({
  handle: z.string().min(1).max(32),
  password: z.string().min(8).max(128),
  schoolId: z.string().max(32).optional(),
});
export const changePasswordSchema = z.object({
  current: z.string().max(128).optional(),
  next: z.string().min(8).max(128),
});
export const profilePatchSchema = z.object({
  displayName: z.string().trim().min(1, "暱稱不能空白").max(24, "暱稱最多 24 個字"),
  schoolId: z.string().max(32).optional().nullable(),
});
export const adminPasswordSchema = z.object({
  password: z.string().min(8).max(128),
});
export const devLoginSchema = z.object({ handle: z.string().min(1).max(20), schoolId: z.string().optional(), role: roleSchema });
export const userPatchSchema = z.object({ role: roleSchema.optional(), banned: z.boolean().optional() });
/** 採納（`acceptedAnswerId: null` 是取消採納）與作者編輯共用同一支 PATCH */
export const questionPatchSchema = z
  .object({
    acceptedAnswerId: z.string().max(64).nullable().optional(),
    title: z.string().min(1).max(200).optional(),
    body: z.string().max(4000).optional(),
  })
  .refine((v) => v.acceptedAnswerId !== undefined || v.title !== undefined || v.body !== undefined, "沒有要改的東西");
export const answerPatchSchema = z.object({ body: z.string().min(1).max(4000) });
export const voteSchema = z.object({ on: z.boolean(), answerId: z.string().min(1).max(64).optional() });
export const reorderSchema = z.object({ moduleId: id, ids: z.array(id).max(200) });
export const uploadVideoSchema = z.object({ lessonId: id, name: z.string().max(200), size: z.number().int().min(0), type: z.string().max(100) });
export const uploadFileSchema = z.object({ challengeId: id, name: z.string().min(1).max(200), size: z.number().int().min(0), type: z.string().max(100) });

const sid = z.string().min(1).max(64);
export const instructorSchema = z.object({
  id: sid,
  name: z.string().min(1).max(60),
  handle: z.string().min(1).max(40),
  role: z.string().max(80),
  domains: z.array(z.string().max(20)).max(10),
  bio: z.string().max(600),
  creds: z.array(z.string().max(80)).max(10),
  accent: z.string().regex(/^#[0-9a-fA-F]{6}$/),
  userId: z.string().max(64).nullable(),
  sortOrder: z.number().int().min(0).max(1000),
});
export const xpAdjustSchema = z.object({
  delta: z
    .number()
    .int()
    .min(-100000)
    .max(100000)
    .refine((n) => n !== 0, "delta 不能是 0"),
  reason: z.string().min(1).max(200),
});
