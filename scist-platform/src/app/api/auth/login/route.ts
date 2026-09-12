import { loginWithPassword, normalizeHandle, setSessionCookie } from "@/server/auth";
import { route, json, readJson } from "@/server/http";
import { clearRateLimit, clientIp, hitRateLimit, isRateLimited, recordAttempt } from "@/server/rate-limit";
import { passwordLoginSchema } from "@/server/validators";
import { ApiError } from "@/server/auth";

const WINDOW = 10 * 60 * 1000;
/** 同一個來源對同一個帳號連續猜錯幾次就先擋下來 */
const PER_HANDLE_IP = 8;
/** 同一個 IP 的洪水上限。一整班共用學校 IP，所以這條要鬆 */
const PER_IP = 120;

/**
 * 兩條線，兩個不同的目的：
 *
 * - 每個 IP 的總量，擋的是有人拿一台機器狂打。訂得鬆，因為一整班同學共用
 *   學校的對外 IP，訂緊會變成第九個登入的人被鎖在門外。
 * - 「這個帳號 + 這個來源」猜錯的次數，擋的是猜密碼。**一定要帶來源**：
 *   handle 是公開資料（排行榜上就有），只綁 handle 的話任何人都能用八次
 *   亂猜把別人鎖十分鐘，而且連管理員重設密碼都解不開。
 */
export const POST = route(async (req: Request) => {
  const ip = clientIp(req);
  if (!hitRateLimit("login:ip:" + ip, PER_IP, WINDOW)) {
    throw new ApiError(429, "這個網路的登入次數太多了，請過幾分鐘再試。");
  }
  const input = await readJson(req, passwordLoginSchema);

  const guessKey = "login:guess:" + normalizeHandle(input.handle) + ":" + ip;
  if (isRateLimited(guessKey, PER_HANDLE_IP, WINDOW)) {
    throw new ApiError(429, "密碼錯太多次了，請過幾分鐘再試一次。");
  }

  let session;
  try {
    session = await loginWithPassword(input);
  } catch (err) {
    if (err instanceof ApiError && err.status === 401) recordAttempt(guessKey, WINDOW);
    throw err;
  }

  await setSessionCookie(session);
  // 想起密碼了就把先前的失敗忘掉，不要讓人被自己幾分鐘前的手誤拖著
  clearRateLimit(guessKey);
  return json({ ok: true, session: { handle: session.handle, role: session.role } });
});
