/**
 * Server-side gates.
 *
 * Learner pages — the lesson player, a challenge's page and the dashboard —
 * need an account: nothing can be watched, answered or submitted without one.
 * A visitor is sent to the home page with the login dialog open and a `next`
 * parameter, so signing in (or registering) lands them right back here.
 *
 * The admin console is gated by role. The API already checks the session on
 * every request; this keeps the HTML shell away from anyone whose role
 * can't use that page — the page ↔ 能力對照表在 src/lib/permissions.ts，
 * 側邊欄讀的是同一張表。
 *
 * /admin?as=… 只有 ENABLE_DEV_LOGIN=1 且非 production 才會簽開發 session。
 * NEXT_PUBLIC_ADMIN_API=local 關掉後台這道門，因為那時後台走瀏覽器儲存、
 * 可能沒有 session；學員頁面不受這個開關影響。
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

/** Home page with the login dialog open; `next` brings the user back afterwards. */
function toLogin(url: NextRequest["nextUrl"], reason: "1" | "admin") {
  const home = new URL("/", url);
  home.searchParams.set("login", reason);
  home.searchParams.set("next", url.pathname + url.search);
  return NextResponse.redirect(home);
}

export async function proxy(req: NextRequest) {
  const url = req.nextUrl;
  const role = await roleFromCookie(req.cookies.get(SESSION_COOKIE)?.value);

  if (!url.pathname.startsWith("/admin")) {
    // learner pages: any account will do, no account will not
    return role ? NextResponse.next() : toLogin(url, "1");
  }

  if (process.env.NEXT_PUBLIC_ADMIN_API === "local") return NextResponse.next();

  const as = url.searchParams.get("as");
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

  return toLogin(url, "admin");
}

export const config = {
  matcher: ["/admin/:path*", "/dashboard", "/learn/:track/:lesson", "/challenges/:slug"],
};
