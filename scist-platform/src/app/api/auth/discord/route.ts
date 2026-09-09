import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { nanoid } from "nanoid";
import { discordAuthorizeUrl } from "@/server/auth";
import { features } from "@/server/env";
import { json } from "@/server/http";

/** Only same-origin paths may be used as a post-login destination. */
export function safeNext(raw: string | null) {
  return raw && raw.startsWith("/") && !raw.startsWith("//") ? raw : null;
}

/**
 * Step 1: send the browser to Discord. A random state cookie guards the
 * callback; an optional ?next= path is remembered so the callback can land
 * the user where they were going (the admin gate uses this).
 */
export async function GET(req: Request) {
  if (!features.discordLogin()) {
    return json({ error: "Discord login is not configured (DISCORD_CLIENT_ID / DISCORD_CLIENT_SECRET)" }, { status: 503 });
  }
  const state = nanoid(24);
  const jar = await cookies();
  jar.set("scist_oauth_state", state, { httpOnly: true, sameSite: "lax", path: "/", maxAge: 600 });
  const next = safeNext(new URL(req.url).searchParams.get("next"));
  if (next) jar.set("scist_oauth_next", next, { httpOnly: true, sameSite: "lax", path: "/", maxAge: 600 });
  else jar.delete("scist_oauth_next");
  return NextResponse.redirect(discordAuthorizeUrl(state));
}
