import { NextResponse } from "next/server";
import { clearSessionCookie } from "@/server/auth";
import { env } from "@/server/env";

export async function POST() {
  await clearSessionCookie();
  return NextResponse.json({ ok: true });
}

export async function GET(req: Request) {
  await clearSessionCookie();
  return NextResponse.redirect(env().APP_URL ?? new URL(req.url).origin);
}
