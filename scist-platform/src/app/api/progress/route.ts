import { requireUser } from "@/server/auth";
import { route, json, readJson } from "@/server/http";
import { progressSchema } from "@/server/validators";
import * as learner from "@/server/repo/learner";

/** One endpoint for lesson progress: watched position, checkpoint answers, completion, notes. */
export const POST = route(async (req: Request) => {
  const user = await requireUser();
  const input = await readJson(req, progressSchema);
  switch (input.action) {
    case "watched":
      return json(await learner.setWatched(user.id, input.track, input.lesson, input.value));
    case "checkpoint":
      return json(await learner.answerCheckpoint(user.id, input.track, input.lesson, input.index));
    case "complete":
      return json(await learner.completeLesson(user.id, input.track, input.lesson));
    case "note":
      return json(await learner.setNote(user.id, input.track, input.lesson, input.note));
  }
});
