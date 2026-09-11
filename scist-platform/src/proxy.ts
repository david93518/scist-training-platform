/**
 * Server-side gate for the admin console. The API already checks the session
 * on every request; this keeps the HTML shell away from anyone whose role
 * can't use that page — the page ↔ 能力對照表在 src/lib/permissions.ts，
 * 側邊欄讀的是同一張表。
 *
 * 沒登入或角色完全進不了後台的，送回首頁並開登入框，帶 `next` 讓他登入後
 * 直接回到原本要去的地方。
 *
 * /admin?as=… 只有 ENABLE_DEV_LOGIN=1 且非 production 才會簽開發 session。
 * NEXT_PUBLIC_ADMIN_API=local 關掉這道門，因為那時後台走瀏覽器儲存、可能沒有 session。
 */
import { NextResponse, type NextRequest } from "next/server";
import { jwtVerify } from "jose";
import { SESSION_COOKIE, sessionSecretBytes } from "@/server/session-secret";
import { can, landingFor, ROLES } from "@/lib/permissions";

const ROLE_NAMES = new Set<string>(ROLES);

async function roleFromCookie(token: string | undefined) {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, sessionSecretBytes());
    return typeof payload.r === "string" ? payload.r : null;
  } catch {
    return null;
  }
}

export async function proxy(req: NextRequest) {
  if (process.env.NEXT_PUBLIC_ADMIN_API === "local") return NextResponse.next();

  const url = req.nextUrl;
  const as = url.searchParams.get("as");
  const role = await roleFromCookie(req.cookies.get(SESSION_COOKIE)?.value);
  const devLoginOn = process.env.NODE_ENV !== "production" && process.env.ENABLE_DEV_LOGIN === "1";

  if (as && ROLE_NAMES.has(as) && devLoginOn) {
    const back = new URL(url);
    back.searchParams.delete("as");
    const dev = new URL("/api/auth/dev", url);
    dev.searchParams.set("role", as);
    dev.searchParams.set("handle", "dev-" + as);
    dev.searchParams.set("next", back.pathname + back.search);
    return NextResponse.redirect(dev);
  }

  const landing = landingFor(role);
  if (landing) {
    // 進不了總覽的角色（助教）直接帶到他的第一頁；其他頁面交給 AdminShell
    // 畫「權限不足」的說明，內容一樣拿不到，因為 API 那邊也是同一張表在擋。
    if (url.pathname === "/admin" && !can(role, "overview.read")) {
      return NextResponse.redirect(new URL(landing, url));
    }
    return NextResponse.next();
  }

  const home = new URL("/", url);
  home.searchParams.set("login", "admin");
  home.searchParams.set("next", url.pathname + url.search);
  return NextResponse.redirect(home);
}

export const config = { matcher: ["/admin/:path*"] };
