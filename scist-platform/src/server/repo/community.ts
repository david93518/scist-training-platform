/**
 * Questions and answers. New questions also go to the Discord channel so the
 * TAs who already live there see them without opening the admin console.
 */
import { and, desc, eq } from "drizzle-orm";
import { getDb, schema } from "../db";
import { ApiError } from "../auth";
import { notifyDiscord, questionMessage } from "../services/discord";
import { env } from "../env";
import type { AdminQuestion } from "@/admin/types";
import type { Question as PublicQuestion } from "@/data/questions";

const ROLE_LABEL: Record<string, "講師" | "助教" | "學員"> = { admin: "講師", instructor: "講師", ta: "助教", student: "學員" };

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
  const db = await getDb();
  const [row] = await db
    .insert(schema.questions)
    .values({ scope: input.scope, refId: input.refId, title: input.title.slice(0, 200), body: input.body.slice(0, 4000), authorId: user.id, authorHandle: user.handle })
    .returning();
  const url = (env().APP_URL ?? "") + (input.scope === "lesson" ? "/learn/" + input.refId : "/challenges/" + input.refId);
  const m = questionMessage({ title: row.title, body: row.body, author: user.handle, url });
  void notifyDiscord(m.content, m.embeds);
  return toPublic({ ...row, answers: [] });
}

export async function createAnswer(user: { id: string; handle: string; role: string }, questionId: string, body: string) {
  const db = await getDb();
  const q = await db.query.questions.findFirst({ where: eq(schema.questions.id, questionId) });
  if (!q) throw new ApiError(404, "question not found");
  const [row] = await db
    .insert(schema.answers)
    .values({ questionId, authorId: user.id, authorHandle: user.handle, authorRole: ROLE_LABEL[user.role] ?? "學員", body: body.slice(0, 4000) })
    .returning();
  return { id: row.id };
}

export async function acceptAnswer(questionId: string, answerId: string) {
  const db = await getDb();
  await db.update(schema.questions).set({ acceptedAnswerId: answerId }).where(eq(schema.questions.id, questionId));
}

export async function deleteQuestion(questionId: string) {
  const db = await getDb();
  await db.delete(schema.questions).where(eq(schema.questions.id, questionId));
}
