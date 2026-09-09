import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { exchangeDiscordCode, upsertDiscordUser, setSessionCookie } from "@/server/auth";
import { env } from "@/server/env";
import { route, json } from "@/server/http";

/** Step 2: Discord sends the user back with ?code&state. */
export const GET = route(async (req: Request) => {
  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const jar = await cookies();
  const expected = jar.get("scist_oauth_state")?.value;
  jar.delete("scist_oauth_state");
  if (!code || !state || state !== expected) return json({ error: "invalid oauth state" }, { status: 400 });

  const discordUser = await exchangeDiscordCode(code);
  const session = await upsertDiscordUser(discordUser);
  await setSessionCookie(session);
  return NextResponse.redirect((env().APP_URL ?? url.origin) + "/dashboard");
});
