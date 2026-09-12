/**
 * Helpers shared by every route handler: JSON responses, error mapping,
 * body validation. Keep handlers thin; logic lives in src/server/repo.
 */
import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import type { ZodType } from "zod";
import { ApiError } from "./auth";
import { env } from "./env";

export function json<T>(data: T, init?: ResponseInit) {
  return NextResponse.json(data, init);
}

export function noContent() {
  return new NextResponse(null, { status: 204 });
}

export async function readJson<T>(req: Request, schema: ZodType<T>): Promise<T> {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    throw new ApiError(400, "request body must be JSON");
  }
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    // 這個訊息會原封不動出現在後台的紅色 toast 上，所以講人話、講清楚是哪個欄位
    const detail = parsed.error.issues.map((i) => (i.path.length ? "「" + i.path.join(".") + "」" : "") + i.message).join("；");
    throw new ApiError(400, "有欄位不符合規定：" + detail);
  }
  return parsed.data;
}

/**
 * Postgres unique-violation → a sentence the person editing can act on.
 * Without this a duplicate slug surfaced in the console as a bare
 * "internal error" and the author had no idea which field to change.
 */
function friendlyDbError(e: unknown): ApiError | null {
  const err = e as { code?: string; constraint_name?: string; constraint?: string; message?: string };
  const code = err?.code;
  if (code !== "23505") return null;
  const target = String(err.constraint_name ?? err.constraint ?? err.message ?? "");
  if (/slug/i.test(target)) return new ApiError(409, "這個網址代稱已經有人用了，換一個再存。");
  if (/handle/i.test(target)) return new ApiError(409, "這個帳號名稱已經被註冊了。");
  return new ApiError(409, "有欄位跟現有資料重複了，請改掉重複的值再存。");
}

/**
 * Whether the caller presented BACKUP_TOKEN.
 *
 * Scheduled jobs (the weekly backup, the weekly settle) have no way to
 * complete a Discord login, so they authenticate with this instead. Treat it
 * as staff-equivalent: only guard endpoints a scheduler is meant to call.
 */
export function hasAutomationToken(req: Request) {
  const expected = env().BACKUP_TOKEN;
  if (!expected) return false;
  const given = req.headers.get("authorization")?.replace(/^Bearer /i, "") ?? "";
  const a = Buffer.from(given);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

/** Wrap a handler so thrown ApiErrors become JSON responses. */
export function route<Args extends unknown[]>(fn: (...args: Args) => Promise<Response>) {
  return async (...args: Args): Promise<Response> => {
    try {
      return await fn(...args);
    } catch (e) {
      if (e instanceof ApiError) return json({ error: e.message }, { status: e.status });
      // a Drizzle failure wraps the driver error; look at both
      const friendly = friendlyDbError(e) ?? friendlyDbError((e as { cause?: unknown })?.cause);
      if (friendly) return json({ error: friendly.message }, { status: friendly.status });
      console.error(e);
      return json({ error: "internal error" }, { status: 500 });
    }
  };
}
