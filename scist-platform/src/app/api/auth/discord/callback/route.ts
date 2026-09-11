import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { ApiError, exchangeDiscordCode, upsertDiscordUser, setSessionCookie } from "@/server/auth";
import { env } from "@/server/env";
import { route, json } from "@/server/http";

/** Step 2: Discord sends the user back with ?code&state. */
export const GET = route(async (req: Request) => {
  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const jar = await cookies();
  const expected = jar.get("scist_oauth_state")?.value;
  const next = jar.get("scist_oauth_next")?.value;
  jar.delete("scist_oauth_state");
  jar.delete("scist_oauth_next");
  if (!code || !state || state !== expected) return json({ error: "invalid oauth state" }, { status: 400 });

  const discordUser = await exchangeDiscordCode(code);
  const origin = env().APP_URL ?? url.origin;

  let session;
  try {
    session = await upsertDiscordUser(discordUser);
  } catch (err) {
    // 停權的話別把人丟到空空的 /dashboard，回首頁開登入框說明原因
    if (err instanceof ApiError && err.status === 403) return NextResponse.redirect(origin + "/?login=banned");
    throw err;
  }

  await setSessionCookie(session);
  const dest = next && next.startsWith("/") && !next.startsWith("//") ? next : "/dashboard";
  return NextResponse.redirect(origin + dest);
});
