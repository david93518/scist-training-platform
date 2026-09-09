import { requireRole } from "@/server/auth";
import { route, json } from "@/server/http";
import { listAudit } from "@/server/repo/ops";

export const GET = route(async (req: Request) => {
  await requireRole("instructor");
  const raw = Number(new URL(req.url).searchParams.get("limit") ?? 200);
  const limit = Math.min(500, Math.max(1, Number.isFinite(raw) ? raw : 200));
  return json(await listAudit(limit));
});
