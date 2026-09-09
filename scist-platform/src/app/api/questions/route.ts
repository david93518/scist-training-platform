import { getCurrentUser, requireUser } from "@/server/auth";
import { route, json, readJson } from "@/server/http";
import { questionCreateSchema } from "@/server/validators";
import { listQuestionsPublic, createQuestion } from "@/server/repo/community";

/** ?scope=lesson|challenge&ref=web-security/sql-injection */
export const GET = route(async (req: Request) => {
  const u = new URL(req.url);
  const scope = u.searchParams.get("scope") === "challenge" ? "challenge" : "lesson";
  const ref = u.searchParams.get("ref") ?? "";
  const viewer = await getCurrentUser();
  return json(await listQuestionsPublic(scope, ref, viewer?.id));
});

export const POST = route(async (req: Request) => {
  const user = await requireUser();
  const input = await readJson(req, questionCreateSchema);
  return json(await createQuestion({ id: user.id, handle: user.handle }, input), { status: 201 });
});
