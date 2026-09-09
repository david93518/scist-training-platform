import { requireRole } from "@/server/auth";
import { route, json, readJson } from "@/server/http";
import { settingsSchema } from "@/server/validators";
import { getSettings, saveSettings } from "@/server/repo/settings";
import { audit } from "@/server/repo/ops";

export const GET = route(async () => {
  await requireRole("instructor");
  return json(await getSettings());
});

export const PUT = route(async (req: Request) => {
  const user = await requireRole("admin");
  const input = await readJson(req, settingsSchema);
  const saved = await saveSettings(input, user.id);
  await audit(user.id, "settings", "settings", null, "更新站點設定");
  return json(saved);
});
