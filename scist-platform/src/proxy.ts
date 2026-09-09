/**
 * Server-side gate for the admin console. The API already checks the session
 * on every request; this keeps the HTML shell away from anyone who is not an
 * instructor or admin.
 *
 * Anyone else is sent to the home page with the login dialog open and a
 * `next` parameter, so a successful login lands them back where they were
 * going instead of leaving them on the front page.
 *
 * /admin?as=… 只有 ENABLE_DEV_LOGIN=1 且非 production 才會簽開發 session。
 * NEXT_PUBLIC_ADMIN_API=local 關掉這道門，因為那時後台走瀏覽器儲存、可能沒有 session。
 */
import { NextResponse, type NextRequest } from "next/server";
import { jwtVerify } from "jose";
import { SESSION_COOKIE, sessionSecretBytes } from "@/server/session-secret";

const ROLES = new Set(["student", "ta", "instructor", "admin"]);

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

  if (as && ROLES.has(as) && devLoginOn) {
    const back = new URL(url);
    back.searchParams.delete("as");
    const dev = new URL("/api/auth/dev", url);
    dev.searchParams.set("role", as);
    dev.searchParams.set("handle", "dev-" + as);
    dev.searchParams.set("next", back.pathname + back.search);
    return NextResponse.redirect(dev);
  }

  if (role === "instructor" || role === "admin") return NextResponse.next();

  const home = new URL("/", url);
  home.searchParams.set("login", "admin");
  home.searchParams.set("next", url.pathname + url.search);
  return NextResponse.redirect(home);
}

export const config = { matcher: ["/admin/:path*"] };
