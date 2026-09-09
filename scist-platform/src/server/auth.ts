/**
 * Sessions are signed JWTs in an httpOnly cookie. No session table needed;
 * revoking a user is done by setting users.banned_at (checked on each read).
 *
 * Login paths (see src/app/api/auth):
 *   POST /api/auth/register          → handle + password，預設學員
 *   POST /api/auth/login             → handle + password
 *   POST /api/auth/password          → 已登入者改密碼
 *   GET  /api/auth/discord           → optional, if Discord is configured
 *   GET  /api/auth/discord/callback
 *   POST /api/auth/logout
 *   POST /api/auth/dev               → only when ENABLE_DEV_LOGIN=1
 */
import { cookies } from "next/headers";
import { SignJWT, jwtVerify } from "jose";
import { and, eq, isNotNull, or, sql } from "drizzle-orm";
import { env, features } from "./env";
import { getDb, schema } from "./db";
import { SESSION_COOKIE, sessionSecretBytes } from "./session-secret";
import { hashPassword, verifyPassword } from "@/lib/password";
import { SCHOOLS } from "@/data/schools";

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

export const ROLE_RANK: Record<Role, number> = { student: 0, ta: 1, instructor: 2, admin: 3 };

const HANDLE_RE = /^[a-z0-9_.-]{3,20}$/;

export function normalizeHandle(raw: string) {
  return raw.trim().toLowerCase();
}

function assertHandle(handle: string) {
  if (!HANDLE_RE.test(handle)) throw new ApiError(400, "帳號只能是 3–20 個英數、底線、點或連字號");
}

function adminHandles() {
  return env()
    .ADMIN_HANDLES.split(",")
    .map((s) => normalizeHandle(s))
    .filter(Boolean);
}

/** 有密碼或綁了 Discord 的管理員才算「用得上」。舊的開發登入帳不算。 */
async function hasAnyAdmin() {
  const db = await getDb();
  const [row] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(schema.users)
    .where(and(eq(schema.users.role, "admin"), or(isNotNull(schema.users.passwordHash), isNotNull(schema.users.discordId))));
  return Number(row?.n ?? 0) > 0;
}

async function roleForNewHandle(handle: string): Promise<Role> {
  if (adminHandles().includes(handle)) return "admin";
  if (!(await hasAnyAdmin())) return "admin";
  return "student";
}

export async function registerAccount(input: { handle: string; password: string; schoolId?: string | null }): Promise<Session> {
  const handle = normalizeHandle(input.handle);
  assertHandle(handle);
  if (input.password.length < 8) throw new ApiError(400, "密碼至少 8 個字");
  if (input.password.length > 128) throw new ApiError(400, "密碼太長");
  const schoolId = input.schoolId?.trim() || null;
  if (schoolId && !SCHOOLS.some((s) => s.id === schoolId)) throw new ApiError(400, "學校不在名單裡");

  const db = await getDb();
  const clash = await db.query.users.findFirst({ where: eq(schema.users.handle, handle) });
  if (clash) throw new ApiError(409, "這個帳號名稱已經有人用了");

  const role = await roleForNewHandle(handle);
  const passwordHash = await hashPassword(input.password);
  const [row] = await db
    .insert(schema.users)
    .values({
      handle,
      displayName: handle,
      passwordHash,
      role,
      schoolId,
      lastSeenAt: new Date(),
    })
    .returning();
  return { userId: row.id, handle: row.handle, role: row.role as Role };
}

export async function loginWithPassword(input: { handle: string; password: string }): Promise<Session> {
  const handle = normalizeHandle(input.handle);
  const db = await getDb();
  const user = await db.query.users.findFirst({ where: eq(schema.users.handle, handle) });
  // 同一個錯誤，避免用「沒有這個帳號」探測名單
  if (!user || user.bannedAt || !user.passwordHash || !(await verifyPassword(input.password, user.passwordHash))) {
    throw new ApiError(401, "帳號或密碼不對");
  }
  await db.update(schema.users).set({ lastSeenAt: new Date() }).where(eq(schema.users.id, user.id));
  return { userId: user.id, handle: user.handle, role: user.role as Role };
}

export async function changePassword(userId: string, input: { current?: string; next: string }) {
  if (input.next.length < 8) throw new ApiError(400, "新密碼至少 8 個字");
  if (input.next.length > 128) throw new ApiError(400, "密碼太長");
  const db = await getDb();
  const user = await db.query.users.findFirst({ where: eq(schema.users.id, userId) });
  if (!user) throw new ApiError(404, "找不到這個帳號");
  if (user.passwordHash) {
    if (!input.current) throw new ApiError(400, "要先填目前的密碼");
    if (!(await verifyPassword(input.current, user.passwordHash))) throw new ApiError(401, "目前的密碼不對");
  }
  await db.update(schema.users).set({ passwordHash: await hashPassword(input.next) }).where(eq(schema.users.id, userId));
}

export async function adminSetPassword(actor: { id: string; role: Role }, userId: string, password: string) {
  if (actor.role !== "admin") throw new ApiError(403, "只有管理員能重設別人的密碼");
  if (password.length < 8) throw new ApiError(400, "密碼至少 8 個字");
  if (password.length > 128) throw new ApiError(400, "密碼太長");
  const db = await getDb();
  const [u] = await db.select({ id: schema.users.id }).from(schema.users).where(eq(schema.users.id, userId));
  if (!u) throw new ApiError(404, "找不到這個帳號");
  await db.update(schema.users).set({ passwordHash: await hashPassword(password) }).where(eq(schema.users.id, userId));
}

/** Cookie 裡的角色過期時，在 route handler 裡重簽，讓後台守門立刻跟著資料庫。 */
export async function refreshSessionIfStale(user: { id: string; handle: string; role: Role }) {
  const session = await getSession();
  if (!session) return;
  if (session.role === user.role && session.handle === user.handle && session.userId === user.id) return;
  await setSessionCookie({ userId: user.id, handle: user.handle, role: user.role });
}

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

  const role: Role = admins.includes(d.id) || !(await hasAnyAdmin()) ? "admin" : "student";
  const [row] = await db
    .insert(schema.users)
    .values({ discordId: d.id, handle, displayName: d.global_name ?? d.username, avatarUrl: avatar, email: d.email ?? null, role, lastSeenAt: new Date() })
    .returning();
  return { userId: row.id, handle: row.handle, role };
}

/** Development login: any handle, any role. Disabled in production. */
export async function devLogin(input: { handle: string; schoolId?: string; role: Role }): Promise<Session> {
  if (!features.devLogin()) throw new ApiError(403, "開發登入已關閉。請用帳號密碼註冊或登入。");
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
