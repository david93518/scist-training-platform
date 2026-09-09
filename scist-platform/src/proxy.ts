/**
 * Server-side gate for the admin console. The API already checks the session
 * on every request; this keeps the HTML shell away from anyone who is not an
 * instructor or admin.
 *
 * Anyone else is sent to the home page with the login dialog open and a
 * `next` parameter, so a successful login lands them back where they were
 * going instead of leaving them on the front page.
 *
 * Development shortcut: /admin?as=admin (or instructor / ta / student) signs a
 * dev session in first, then comes back to the same page. Never in production.
 * NEXT_PUBLIC_ADMIN_API=local turns the gate off, because in that mode the
 * console runs on browser storage and there may be no session at all.
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

  if (as && ROLES.has(as) && process.env.NODE_ENV !== "production") {
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
