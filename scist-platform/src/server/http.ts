/**
 * Helpers shared by every route handler: JSON responses, error mapping,
 * body validation. Keep handlers thin; logic lives in src/server/repo.
 */
import { NextResponse } from "next/server";
import type { ZodType } from "zod";
import { ApiError } from "./auth";

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
    throw new ApiError(400, "invalid body: " + parsed.error.issues.map((i) => i.path.join(".") + " " + i.message).join("; "));
  }
  return parsed.data;
}

/** Wrap a handler so thrown ApiErrors become JSON responses. */
export function route<Args extends unknown[]>(fn: (...args: Args) => Promise<Response>) {
  return async (...args: Args): Promise<Response> => {
    try {
      return await fn(...args);
    } catch (e) {
      if (e instanceof ApiError) return json({ error: e.message }, { status: e.status });
      console.error(e);
      return json({ error: "internal error" }, { status: 500 });
    }
  };
}
