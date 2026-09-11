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
import { can } from "@/lib/permissions";
import type { AdminQuestion } from "@/admin/types";
import type { Question as PublicQuestion } from "@/data/questions";

const ROLE_LABEL: Record<string, "講師" | "助教" | "學員"> = { admin: "講師", instructor: "講師", ta: "助教", student: "學員" };

/** 5 posts per 10 minutes per learner; every question also fires a webhook */
const POST_WINDOW_MS = 10 * 60_000;
const POST_LIMIT = 5;

/**
 * 讀的是 src/lib/permissions.ts 那張表，跟後台問答頁同一套：助教以上能回覆與
 * 採納，刪掉別人的東西要講師以上。
 */
const isStaff = (role: string) => can(role, "questions.answer");
const mayModerate = (role: string) => can(role, "questions.delete");

async function assertQuestionsOpen() {
  const { features } = await getSettings();
  if (!features.questions) throw new ApiError(403, "目前沒有開放發問");
}

type Row = typeof schema.questions.$inferSelect & { answers: (typeof schema.answers.$inferSelect)[] };

/** what the reader already voted up, so the buttons render in the right state */
interface Viewer {
  id: string;
  questionVotes: Set<string>;
  answerVotes: Set<string>;
}

function toPublic(q: Row, viewer?: Viewer): PublicQuestion {
  return {
    id: q.id,
    scope: q.scope,
    refId: q.refId,
    title: q.title,
    body: q.body,
    author: q.authorHandle,
    createdAt: q.createdAt.toISOString(),
    editedAt: q.editedAt?.toISOString(),
    votes: q.votes,
    voted: viewer?.questionVotes.has(q.id) || undefined,
    mine: (viewer && q.authorId === viewer.id) || undefined,
    answers: [...q.answers]
      .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime())
      .map((a) => ({
        id: a.id,
        author: a.authorHandle,
        role: (a.authorRole as "講師" | "助教" | "學員") ?? "學員",
        body: a.body,
        createdAt: a.createdAt.toISOString(),
        editedAt: a.editedAt?.toISOString(),
        votes: a.votes,
        accepted: q.acceptedAnswerId === a.id || undefined,
        voted: viewer?.answerVotes.has(a.id) || undefined,
        mine: (viewer && a.authorId === viewer.id) || undefined,
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
    editedAt: q.editedAt?.toISOString() ?? null,
    acceptedAnswerId: q.acceptedAnswerId,
    answers: [...q.answers]
      .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime())
      .map((a) => ({
        id: a.id,
        authorHandle: a.authorHandle,
        authorRole: a.authorRole,
        body: a.body,
        createdAt: a.createdAt.toISOString(),
        editedAt: a.editedAt?.toISOString() ?? null,
        votes: a.votes,
      })),
  };
}

export async function listQuestionsPublic(scope: "lesson" | "challenge", refId: string, viewerId?: string) {
  const db = await getDb();
  const rows = await db.query.questions.findMany({
    where: and(eq(schema.questions.scope, scope), eq(schema.questions.refId, refId)),
    with: { answers: true },
    orderBy: desc(schema.questions.createdAt),
  });
  const viewer = viewerId ? await loadViewer(viewerId) : undefined;
  return rows.map((r) => toPublic(r, viewer));
}

async function loadViewer(userId: string): Promise<Viewer> {
  const db = await getDb();
  const [qv, av] = await Promise.all([
    db.select({ id: schema.questionVotes.questionId }).from(schema.questionVotes).where(eq(schema.questionVotes.userId, userId)),
    db.select({ id: schema.answerVotes.answerId }).from(schema.answerVotes).where(eq(schema.answerVotes.userId, userId)),
  ]);
  return { id: userId, questionVotes: new Set(qv.map((r) => r.id)), answerVotes: new Set(av.map((r) => r.id)) };
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
 * Marks the answer that solved the thread, or clears it when `answerId` is
 * null — 標了最佳解答不代表討論結束，換一個或收回都可以。TAs and above can do
 * this on any question; everyone else only on their own (`actor` left out =
 * trusted call).
 */
export async function acceptAnswer(questionId: string, answerId: string | null, actor?: { id: string; role: string }) {
  const db = await getDb();
  const q = await db.query.questions.findFirst({ where: eq(schema.questions.id, questionId) });
  if (!q) throw new ApiError(404, "question not found");
  if (actor && !isStaff(actor.role) && q.authorId !== actor.id) {
    throw new ApiError(403, "只有發問者本人或助教可以採納回答");
  }
  if (answerId) {
    const answer = await db.query.answers.findFirst({
      where: and(eq(schema.answers.id, answerId), eq(schema.answers.questionId, questionId)),
    });
    if (!answer) throw new ApiError(404, "answer not found");
  }
  await db.update(schema.questions).set({ acceptedAnswerId: answerId }).where(eq(schema.questions.id, questionId));
}

/* --------------------------- 編輯與刪除自己的內容 --------------------------- */
/**
 * 只有作者能改自己寫的字。助教與講師能刪、能採納，但不能替別人改內容，
 * 不然討論串會變成沒人知道原本寫了什麼。改過會留 editedAt。
 */
export async function updateQuestion(actor: { id: string; role: string }, questionId: string, input: { title?: string; body?: string }) {
  const db = await getDb();
  const q = await db.query.questions.findFirst({ where: eq(schema.questions.id, questionId) });
  if (!q) throw new ApiError(404, "question not found");
  if (q.authorId !== actor.id) throw new ApiError(403, "只能編輯自己發的問題");

  const title = input.title?.trim();
  const body = input.body?.trim();
  if (input.title !== undefined && !title) throw new ApiError(400, "標題不能空白");

  await db
    .update(schema.questions)
    .set({ title: (title ?? q.title).slice(0, 200), body: (body ?? q.body).slice(0, 4000), editedAt: new Date() })
    .where(eq(schema.questions.id, questionId));
}

export async function updateAnswer(actor: { id: string; role: string }, answerId: string, body: string) {
  const db = await getDb();
  const a = await db.query.answers.findFirst({ where: eq(schema.answers.id, answerId) });
  if (!a) throw new ApiError(404, "answer not found");
  if (a.authorId !== actor.id) throw new ApiError(403, "只能編輯自己的回覆");
  const next = body.trim();
  if (!next) throw new ApiError(400, "回覆不能空白");
  await db.update(schema.answers).set({ body: next.slice(0, 4000), editedAt: new Date() }).where(eq(schema.answers.id, answerId));
}

/**
 * 作者要收回整串問題，只能在還沒有別人回覆的時候——已經有人花時間回答了，
 * 一鍵刪掉會把別人的貢獻一起帶走。之後想撤只能請助教處理。
 */
export async function deleteOwnQuestion(actor: { id: string; role: string }, questionId: string) {
  const db = await getDb();
  const q = await db.query.questions.findFirst({ where: eq(schema.questions.id, questionId), with: { answers: true } });
  if (!q) throw new ApiError(404, "question not found");
  if (!mayModerate(actor.role)) {
    if (q.authorId !== actor.id) throw new ApiError(403, "只能刪自己發的問題");
    if (q.answers.some((a) => a.authorId !== actor.id)) {
      throw new ApiError(400, "已經有人回覆了，不能整串刪掉。要撤下請找助教或講師。");
    }
  }
  await db.delete(schema.questions).where(eq(schema.questions.id, questionId));
}

/** 刪掉被採納的那則回覆時，順手把最佳解答的標記清掉，不然會指向不存在的 id */
export async function deleteAnswer(actor: { id: string; role: string }, answerId: string) {
  const db = await getDb();
  const a = await db.query.answers.findFirst({ where: eq(schema.answers.id, answerId) });
  if (!a) throw new ApiError(404, "answer not found");
  if (!mayModerate(actor.role) && a.authorId !== actor.id) throw new ApiError(403, "只能刪自己的回覆");

  await db
    .update(schema.questions)
    .set({ acceptedAnswerId: null })
    .where(and(eq(schema.questions.id, a.questionId), eq(schema.questions.acceptedAnswerId, answerId)));
  await db.delete(schema.answers).where(eq(schema.answers.id, answerId));
}

/* ------------------------------ votes ------------------------------ */
/**
 * Toggling a vote moves the counter and the dedup row together. The counter
 * carries the seeded numbers, so it is adjusted rather than recomputed.
 */
export async function voteQuestion(userId: string, questionId: string, on: boolean) {
  const db = await getDb();
  const q = await db.query.questions.findFirst({ where: eq(schema.questions.id, questionId), columns: { id: true, votes: true } });
  if (!q) throw new ApiError(404, "question not found");

  const existing = await db.query.questionVotes.findFirst({
    where: and(eq(schema.questionVotes.userId, userId), eq(schema.questionVotes.questionId, questionId)),
  });
  if (on === Boolean(existing)) return { votes: q.votes, voted: on };

  if (on) await db.insert(schema.questionVotes).values({ userId, questionId }).onConflictDoNothing();
  else await db.delete(schema.questionVotes).where(and(eq(schema.questionVotes.userId, userId), eq(schema.questionVotes.questionId, questionId)));

  const votes = Math.max(0, q.votes + (on ? 1 : -1));
  await db.update(schema.questions).set({ votes }).where(eq(schema.questions.id, questionId));
  return { votes, voted: on };
}

export async function voteAnswer(userId: string, answerId: string, on: boolean) {
  const db = await getDb();
  const a = await db.query.answers.findFirst({ where: eq(schema.answers.id, answerId), columns: { id: true, votes: true } });
  if (!a) throw new ApiError(404, "answer not found");

  const existing = await db.query.answerVotes.findFirst({
    where: and(eq(schema.answerVotes.userId, userId), eq(schema.answerVotes.answerId, answerId)),
  });
  if (on === Boolean(existing)) return { votes: a.votes, voted: on };

  if (on) await db.insert(schema.answerVotes).values({ userId, answerId }).onConflictDoNothing();
  else await db.delete(schema.answerVotes).where(and(eq(schema.answerVotes.userId, userId), eq(schema.answerVotes.answerId, answerId)));

  const votes = Math.max(0, a.votes + (on ? 1 : -1));
  await db.update(schema.answers).set({ votes }).where(eq(schema.answers.id, answerId));
  return { votes, voted: on };
}

export async function deleteQuestion(questionId: string) {
  const db = await getDb();
  await db.delete(schema.questions).where(eq(schema.questions.id, questionId));
}
