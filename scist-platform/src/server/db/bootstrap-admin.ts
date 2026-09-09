/**
 * 用環境變數建立第一個管理員。從 connect() 呼叫，傳入已連上的 db，
 * 不要再走 getDb()，否則會跟連線 Promise 互相等。
 */
import { eq } from "drizzle-orm";
import * as schema from "./schema";
import { env } from "../env";
import { hashPassword } from "@/lib/password";
import type { Db } from "./index";

const HANDLE_RE = /^[a-z0-9_.-]{3,20}$/;

export async function ensureBootstrapAdmin(db: Db) {
  const raw = env().BOOTSTRAP_ADMIN_HANDLE?.trim();
  const password = env().BOOTSTRAP_ADMIN_PASSWORD;
  if (!raw || !password) return;

  const handle = raw.toLowerCase();
  if (!HANDLE_RE.test(handle)) {
    console.error("[auth] BOOTSTRAP_ADMIN_HANDLE 格式不對，略過");
    return;
  }

  const existing = await db.query.users.findFirst({ where: eq(schema.users.handle, handle) });
  if (existing) {
    const patch: { lastSeenAt: Date; role?: "admin"; passwordHash?: string } = { lastSeenAt: new Date() };
    let changed = false;
    if (existing.role !== "admin") {
      patch.role = "admin";
      changed = true;
    }
    if (!existing.passwordHash) {
      patch.passwordHash = await hashPassword(password);
      changed = true;
    }
    if (changed) {
      await db.update(schema.users).set(patch).where(eq(schema.users.id, existing.id));
      console.log("[auth] 已套用啟動管理員 " + handle);
    }
    return;
  }

  await db.insert(schema.users).values({
    handle,
    displayName: handle,
    passwordHash: await hashPassword(password),
    role: "admin",
    lastSeenAt: new Date(),
  });
  console.log("[auth] 已建立啟動管理員 " + handle);
}
