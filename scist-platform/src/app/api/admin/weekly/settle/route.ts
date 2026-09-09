import { requireRole } from "@/server/auth";
import { siteUrl } from "@/server/env";
import { route, json, hasAutomationToken } from "@/server/http";
import { getSettings } from "@/server/repo/settings";
import { settleWeeklyChallenge } from "@/server/repo/site";
import { audit } from "@/server/repo/ops";

/**
 * 週結算：發本週挑戰前三名的加分，並貼 Discord 戰報。
 *
 * 後台有按鈕，也接受 BACKUP_TOKEN，讓 weekly-settle.yml 每週自己打一次。
 * 同一週重複觸發不會重複發分，判定在 settleWeeklyChallenge 裡。
 */
export const POST = route(async (req: Request) => {
  const actor = hasAutomationToken(req) ? null : await requireRole("instructor");
  const settings = await getSettings();
  const result = await settleWeeklyChallenge(settings.weekly, settings.leaderboard.weekStartsOn, siteUrl());
  if (result.ok) await audit(actor?.id ?? null, "xp", "weekly", settings.weekly.slug, result.message);
  return json(result);
});
