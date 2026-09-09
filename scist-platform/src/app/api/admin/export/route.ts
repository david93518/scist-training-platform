import { requireRole } from "@/server/auth";
import { route, json, hasAutomationToken } from "@/server/http";
import { exportAll } from "@/server/repo/transfer";

export const GET = route(async (req: Request) => {
  // 每週備份的 GitHub Action 沒辦法走 Discord 登入，所以也吃 BACKUP_TOKEN
  if (!hasAutomationToken(req)) await requireRole("instructor");
  return json(await exportAll());
});
