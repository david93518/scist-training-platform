import { loginWithPassword, setSessionCookie } from "@/server/auth";
import { route, json, readJson } from "@/server/http";
import { clientIp, hitRateLimit } from "@/server/rate-limit";
import { passwordLoginSchema } from "@/server/validators";
import { ApiError } from "@/server/auth";

export const POST = route(async (req: Request) => {
  if (!hitRateLimit("login:" + clientIp(req), 8, 10 * 60 * 1000)) {
    throw new ApiError(429, "嘗試太多次，過幾分鐘再試");
  }
  const input = await readJson(req, passwordLoginSchema);
  const session = await loginWithPassword(input);
  await setSessionCookie(session);
  return json({ ok: true, session: { handle: session.handle, role: session.role } });
});
