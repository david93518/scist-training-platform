import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { nanoid } from "nanoid";
import { discordAuthorizeUrl } from "@/server/auth";
import { features } from "@/server/env";
import { json } from "@/server/http";

/** Step 1: send the browser to Discord. A random state cookie guards the callback. */
export async function GET() {
  if (!features.discordLogin()) {
    return json({ error: "Discord login is not configured (DISCORD_CLIENT_ID / DISCORD_CLIENT_SECRET)" }, { status: 503 });
  }
  const state = nanoid(24);
  (await cookies()).set("scist_oauth_state", state, { httpOnly: true, sameSite: "lax", path: "/", maxAge: 600 });
  return NextResponse.redirect(discordAuthorizeUrl(state));
}
