/**
 * Sessions are signed JWTs in an httpOnly cookie. No session table needed;
 * revoking a user is done by setting users.banned_at (checked on each read).
 *
 * Login paths (see src/app/api/auth):
 *   GET  /api/auth/discord           → redirect to Discord
 *   GET  /api/auth/discord/callback  → exchange code, upsert user, set cookie
 *   POST /api/auth/dev               → development only, pick a role
 *   POST /api/auth/logout
 */
import { cookies } from "next/headers";
import { SignJWT, jwtVerify } from "jose";
import { eq } from "drizzle-orm";
import { env, features } from "./env";
import { getDb, schema } from "./db";
import { SESSION_COOKIE, sessionSecretBytes } from "./session-secret";

export type Role = "student" | "ta" | "instructor" | "admin";

export interface Session {
  userId: string;
  handle: string;
  role: Role;
}

const COOKIE = SESSION_COOKIE;
const MAX_AGE = 60 * 60 * 24 * 30; // 30 days

const secret = sessionSecretBytes;

export async function signSession(session: Session) {
  return new SignJWT({ h: session.handle, r: session.role })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(session.userId)
    .setIssuedAt()
    .setExpirationTime(Math.floor(Date.now() / 1000) + MAX_AGE)
    .sign(secret());
}

export async function verifySession(token: string): Promise<Session | null> {
  try {
    const { payload } = await jwtVerify(token, secret());
    if (!payload.sub) return null;
    return { userId: payload.sub, handle: String(payload.h ?? ""), role: (payload.r as Role) ?? "student" };
  } catch {
    return null;
  }
}

/** Route handlers and server actions only (cookies().set needs a response). */
export async function setSessionCookie(session: Session) {
  const token = await signSession(session);
  (await cookies()).set(COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: env().NODE_ENV === "production",
    path: "/",
    maxAge: MAX_AGE,
  });
}

export async function clearSessionCookie() {
  (await cookies()).delete(COOKIE);
}

/** Cheap read: trusts the signed cookie, no database hit. */
export async function getSession(): Promise<Session | null> {
  const token = (await cookies()).get(COOKIE)?.value;
  if (!token) return null;
  return verifySession(token);
}

/** Full read: also confirms the user still exists and is not banned. */
export async function getCurrentUser() {
  const session = await getSession();
  if (!session) return null;
  const db = await getDb();
  const user = await db.query.users.findFirst({ where: eq(schema.users.id, session.userId) });
  if (!user || user.bannedAt) return null;
  // role in the database wins over the one baked into the cookie
  return { ...user, role: user.role as Role };
}

export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

const ROLE_RANK: Record<Role, number> = { student: 0, ta: 1, instructor: 2, admin: 3 };

export async function requireUser() {
  const user = await getCurrentUser();
  if (!user) throw new ApiError(401, "需要登入");
  return user;
}

export async function requireRole(min: Role) {
  const user = await requireUser();
  if (ROLE_RANK[user.role] < ROLE_RANK[min]) throw new ApiError(403, "需要" + min + "以上的權限");
  return user;
}

/* ------------------------------ Discord ------------------------------ */
export function discordAuthorizeUrl(state: string) {
  const { DISCORD_CLIENT_ID, APP_URL } = env();
  const params = new URLSearchParams({
    client_id: DISCORD_CLIENT_ID ?? "",
    redirect_uri: (APP_URL ?? "http://localhost:3000") + "/api/auth/discord/callback",
    response_type: "code",
    scope: "identify email",
    state,
    prompt: "none",
  });
  return "https://discord.com/oauth2/authorize?" + params.toString();
}

interface DiscordUser {
  id: string;
  username: string;
  global_name?: string | null;
  avatar?: string | null;
  email?: string | null;
}

export async function exchangeDiscordCode(code: string): Promise<DiscordUser> {
  const { DISCORD_CLIENT_ID, DISCORD_CLIENT_SECRET, APP_URL } = env();
  const tokenRes = await fetch("https://discord.com/api/oauth2/token", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: DISCORD_CLIENT_ID ?? "",
      client_secret: DISCORD_CLIENT_SECRET ?? "",
      grant_type: "authorization_code",
      code,
      redirect_uri: (APP_URL ?? "http://localhost:3000") + "/api/auth/discord/callback",
    }),
  });
  if (!tokenRes.ok) throw new ApiError(502, "Discord token exchange failed: " + (await tokenRes.text()));
  const token = (await tokenRes.json()) as { access_token: string };

  const userRes = await fetch("https://discord.com/api/users/@me", {
    headers: { authorization: "Bearer " + token.access_token },
  });
  if (!userRes.ok) throw new ApiError(502, "Discord user lookup failed");
  return (await userRes.json()) as DiscordUser;
}

/** Creates or updates the user row for a Discord account and returns a session. */
export async function upsertDiscordUser(d: DiscordUser): Promise<Session> {
  const db = await getDb();
  const admins = env()
    .ADMIN_DISCORD_IDS.split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  const avatar = d.avatar ? "https://cdn.discordapp.com/avatars/" + d.id + "/" + d.avatar + ".png" : null;

  const existing = await db.query.users.findFirst({ where: eq(schema.users.discordId, d.id) });
  if (existing) {
    const role = admins.includes(d.id) && existing.role !== "admin" ? "admin" : existing.role;
    await db
      .update(schema.users)
      .set({ displayName: d.global_name ?? d.username, avatarUrl: avatar, email: d.email ?? existing.email, lastSeenAt: new Date(), role })
      .where(eq(schema.users.id, existing.id));
    return { userId: existing.id, handle: existing.handle, role: role as Role };
  }

  // handles must be unique; fall back to username + suffix
  let handle = d.username.toLowerCase().replace(/[^a-z0-9_.-]/g, "").slice(0, 20) || "user";
  const clash = await db.query.users.findFirst({ where: eq(schema.users.handle, handle) });
  if (clash) handle = handle + "-" + d.id.slice(-4);

  const role: Role = admins.includes(d.id) ? "admin" : "student";
  const [row] = await db
    .insert(schema.users)
    .values({ discordId: d.id, handle, displayName: d.global_name ?? d.username, avatarUrl: avatar, email: d.email ?? null, role, lastSeenAt: new Date() })
    .returning();
  return { userId: row.id, handle: row.handle, role };
}

/** Development login: any handle, any role. Disabled in production. */
export async function devLogin(input: { handle: string; schoolId?: string; role: Role }): Promise<Session> {
  if (!features.devLogin()) throw new ApiError(403, "dev login is disabled in production");
  const db = await getDb();
  const handle = input.handle.toLowerCase().replace(/[^a-z0-9_.-]/g, "").slice(0, 20) || "dev";
  const existing = await db.query.users.findFirst({ where: eq(schema.users.handle, handle) });
  if (existing) {
    await db.update(schema.users).set({ role: input.role, schoolId: input.schoolId ?? existing.schoolId, lastSeenAt: new Date() }).where(eq(schema.users.id, existing.id));
    return { userId: existing.id, handle, role: input.role };
  }
  const [row] = await db
    .insert(schema.users)
    .values({ handle, displayName: handle, role: input.role, schoolId: input.schoolId ?? null, lastSeenAt: new Date() })
    .returning();
  return { userId: row.id, handle, role: input.role };
}
