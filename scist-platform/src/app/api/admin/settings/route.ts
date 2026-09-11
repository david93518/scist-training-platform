import { requireCap } from "@/server/auth";
import { route, json, readJson } from "@/server/http";
import { settingsSchema } from "@/server/validators";
import { getSettings, saveSettings } from "@/server/repo/settings";
import { audit } from "@/server/repo/ops";
import { diffSettings } from "@/lib/audit-diff";

export const GET = route(async () => {
  await requireCap("settings.read");
  return json(await getSettings());
});

export const PUT = route(async (req: Request) => {
  const user = await requireCap("settings.write");
  const input = await readJson(req, settingsSchema);
  const before = await getSettings();
  const saved = await saveSettings(input, user.id);
  const changes = diffSettings(before, saved);
  const label = changes.length ? "更新站點設定 · " + changes.map((c) => c.label).join("、") : "站點設定（內容沒有變更）";
  await audit(user.id, "settings", "settings", null, label, changes);
  return json(saved);
});
