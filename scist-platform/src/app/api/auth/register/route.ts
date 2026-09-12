import { registerAccount, setSessionCookie } from "@/server/auth";
import { route, json, readJson } from "@/server/http";
import { clientIp, hitRateLimit } from "@/server/rate-limit";
import { passwordRegisterSchema } from "@/server/validators";
import { ApiError } from "@/server/auth";

/**
 * 一整班在同一節課註冊是正常情況，而且全班共用學校的對外 IP，所以這條線
 * 要能容得下一個班級；它擋的是腳本大量灌帳號，不是同學一起報到。
 */
const WINDOW = 60 * 60 * 1000;
const PER_IP = 60;

export const POST = route(async (req: Request) => {
  if (!hitRateLimit("register:ip:" + clientIp(req), PER_IP, WINDOW)) {
    throw new ApiError(429, "這個網路註冊的帳號太多了，請過一段時間再試，或請老師聯絡管理員。");
  }
  const input = await readJson(req, passwordRegisterSchema);
  const session = await registerAccount(input);
  await setSessionCookie(session);
  return json({ ok: true, session: { handle: session.handle, role: session.role } });
});
