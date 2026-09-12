import { NextResponse } from "next/server";
import { devLogin, setSessionCookie } from "@/server/auth";
import { route, json, readJson } from "@/server/http";
import { devLoginSchema } from "@/server/validators";
import { safeNextPath } from "@/lib/safe-next";

/** Development only: log in as any handle with any role. */
export const POST = route(async (req: Request) => {
  const input = await readJson(req, devLoginSchema);
  const session = await devLogin(input);
  await setSessionCookie(session);
  return json({ ok: true, session });
});

/**
 * Same thing as a link, used by the /admin?as=… shortcut:
 * GET /api/auth/dev?role=admin&handle=dev-admin&next=/admin
 */
export const GET = route(async (req: Request) => {
  const url = new URL(req.url);
  const input = devLoginSchema.parse({
    handle: url.searchParams.get("handle") ?? "dev-" + (url.searchParams.get("role") ?? "student"),
    role: url.searchParams.get("role") ?? "student",
  });
  const session = await devLogin(input);
  await setSessionCookie(session);
  const safe = safeNextPath(url.searchParams.get("next")) ?? "/";
  return NextResponse.redirect(new URL(safe, url.origin));
});
