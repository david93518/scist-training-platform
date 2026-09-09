import { changePassword, requireUser } from "@/server/auth";
import { route, json, readJson } from "@/server/http";
import { changePasswordSchema } from "@/server/validators";

export const POST = route(async (req: Request) => {
  const user = await requireUser();
  const input = await readJson(req, changePasswordSchema);
  await changePassword(user.id, input);
  return json({ ok: true });
});
