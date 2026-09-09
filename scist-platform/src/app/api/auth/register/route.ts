import { registerAccount, setSessionCookie } from "@/server/auth";
import { route, json, readJson } from "@/server/http";
import { clientIp, hitRateLimit } from "@/server/rate-limit";
import { passwordRegisterSchema } from "@/server/validators";
import { ApiError } from "@/server/auth";

export const POST = route(async (req: Request) => {
  if (!hitRateLimit("register:" + clientIp(req), 8, 10 * 60 * 1000)) {
    throw new ApiError(429, "嘗試太多次，過幾分鐘再試");
  }
  const input = await readJson(req, passwordRegisterSchema);
  const session = await registerAccount(input);
  await setSessionCookie(session);
  return json({ ok: true, session: { handle: session.handle, role: session.role } });
});
