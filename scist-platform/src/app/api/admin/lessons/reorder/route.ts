import { requireCap } from "@/server/auth";
import { route, noContent, readJson } from "@/server/http";
import { reorderSchema } from "@/server/validators";
import { reorderLessons } from "@/server/repo/content";

export const POST = route(async (req: Request) => {
  await requireCap("content.write");
  const { moduleId, ids } = await readJson(req, reorderSchema);
  await reorderLessons(moduleId, ids);
  return noContent();
});
