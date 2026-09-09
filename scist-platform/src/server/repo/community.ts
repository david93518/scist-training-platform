/**
 * Questions and answers. New questions also go to the Discord channel so the
 * TAs who already live there see them without opening the admin console.
 */
import { and, desc, eq, gte, sql } from "drizzle-orm";
import { getDb, schema } from "../db";
import { ApiError } from "../auth";
import { notifyDiscord, questionMessage } from "../services/discord";
import { getSettings } from "./settings";
import { env } from "../env";
import type { AdminQuestion } from "@/admin/types";
import type { Question as PublicQuestion } from "@/data/questions";

const ROLE_LABEL: Record<string, "講師" | "助教" | "學員"> = { admin: "講師", instructor: "講師", ta: "助教", student: "學員" };

/** 5 posts per 10 minutes per learner; every question also fires a webhook */
const POST_WINDOW_MS = 10 * 60_000;
const POST_LIMIT = 5;

const isStaff = (role: string) => role === "ta" || role === "instructor" || role === "admin";

async function assertQuestionsOpen() {
  const { features } = await getSettings();
  if (!features.questions) throw new ApiError(403, "目前沒有開放發問");
}

type Row = typeof schema.questions.$inferSelect & { answers: (typeof schema.answers.$inferSelect)[] };

function toPublic(q: Row): PublicQuestion {
  return {
    id: q.id,
    scope: q.scope,
    refId: q.refId,
    title: q.title,
    body: q.body,
    author: q.authorHandle,
    createdAt: q.createdAt.toISOString(),
    votes: q.votes,
    answers: [...q.answers]
      .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime())
      .map((a) => ({
        id: a.id,
        author: a.authorHandle,
        role: (a.authorRole as "講師" | "助教" | "學員") ?? "學員",
        body: a.body,
        createdAt: a.createdAt.toISOString(),
        votes: a.votes,
        accepted: q.acceptedAnswerId === a.id || undefined,
      })),
  };
}

function toAdmin(q: Row): AdminQuestion {
  return {
    id: q.id,
    scope: q.scope,
    refId: q.refId,
    title: q.title,
    body: q.body,
    authorHandle: q.authorHandle,
    votes: q.votes,
    createdAt: q.createdAt.toISOString(),
    acceptedAnswerId: q.acceptedAnswerId,
    answers: [...q.answers]
      .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime())
      .map((a) => ({ id: a.id, authorHandle: a.authorHandle, authorRole: a.authorRole, body: a.body, createdAt: a.createdAt.toISOString(), votes: a.votes })),
  };
}

export async function listQuestionsPublic(scope: "lesson" | "challenge", refId: string) {
  const db = await getDb();
  const rows = await db.query.questions.findMany({
    where: and(eq(schema.questions.scope, scope), eq(schema.questions.refId, refId)),
    with: { answers: true },
    orderBy: desc(schema.questions.createdAt),
  });
  return rows.map(toPublic);
}

export async function listQuestionsAdmin() {
  const db = await getDb();
  const rows = await db.query.questions.findMany({ with: { answers: true }, orderBy: desc(schema.questions.createdAt) });
  return rows.map(toAdmin);
}

export async function createQuestion(user: { id: string; handle: string }, input: { scope: "lesson" | "challenge"; refId: string; title: string; body: string }) {
  await assertQuestionsOpen();
  const db = await getDb();

  const [{ n }] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(schema.questions)
    .where(and(eq(schema.questions.authorId, user.id), gte(schema.questions.createdAt, new Date(Date.now() - POST_WINDOW_MS))));
  if (Number(n) >= POST_LIMIT) throw new ApiError(429, "發問太頻繁了，十分鐘內最多 " + POST_LIMIT + " 則。把幾個問題寫在同一則裡，助教也比較好回。");

  const [row] = await db
    .insert(schema.questions)
    .values({ scope: input.scope, refId: input.refId, title: input.title.slice(0, 200), body: input.body.slice(0, 4000), authorId: user.id, authorHandle: user.handle })
    .returning();
  const url = (env().APP_URL ?? "") + (input.scope === "lesson" ? "/learn/" + input.refId : "/challenges/" + input.refId);
  const m = questionMessage({ title: row.title, body: row.body, author: user.handle, url });
  void notifyDiscord(m.content, m.embeds);
  return toPublic({ ...row, answers: [] });
}

/** `fromAdmin` marks the admin console, which is never gated or throttled. */
export async function createAnswer(
  user: { id: string; handle: string; role: string },
  questionId: string,
  body: string,
  { fromAdmin = false }: { fromAdmin?: boolean } = {},
) {
  const staff = fromAdmin || isStaff(user.role);
  if (!staff) await assertQuestionsOpen();

  const db = await getDb();
  const q = await db.query.questions.findFirst({ where: eq(schema.questions.id, questionId) });
  if (!q) throw new ApiError(404, "question not found");

  if (!staff) {
    const [{ n }] = await db
      .select({ n: sql<number>`count(*)::int` })
      .from(schema.answers)
      .where(and(eq(schema.answers.authorId, user.id), gte(schema.answers.createdAt, new Date(Date.now() - POST_WINDOW_MS))));
    if (Number(n) >= POST_LIMIT) throw new ApiError(429, "回覆太頻繁了，十分鐘內最多 " + POST_LIMIT + " 則");
  }

  const [row] = await db
    .insert(schema.answers)
    .values({ questionId, authorId: user.id, authorHandle: user.handle, authorRole: ROLE_LABEL[user.role] ?? "學員", body: body.slice(0, 4000) })
    .returning();
  return { id: row.id };
}

/**
 * Marks the answer that solved the thread. TAs and above can do this on any
 * question; everyone else only on their own (`actor` left out = trusted call).
 */
export async function acceptAnswer(questionId: string, answerId: string, actor?: { id: string; role: string }) {
  const db = await getDb();
  const q = await db.query.questions.findFirst({ where: eq(schema.questions.id, questionId) });
  if (!q) throw new ApiError(404, "question not found");
  if (actor && !isStaff(actor.role) && q.authorId !== actor.id) {
    throw new ApiError(403, "只有發問者本人或助教可以採納回答");
  }
  const answer = await db.query.answers.findFirst({
    where: and(eq(schema.answers.id, answerId), eq(schema.answers.questionId, questionId)),
  });
  if (!answer) throw new ApiError(404, "answer not found");
  await db.update(schema.questions).set({ acceptedAnswerId: answerId }).where(eq(schema.questions.id, questionId));
}

export async function deleteQuestion(questionId: string) {
  const db = await getDb();
  await db.delete(schema.questions).where(eq(schema.questions.id, questionId));
}
