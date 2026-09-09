import { timingSafeEqual } from "node:crypto";
import { requireRole } from "@/server/auth";
import { env } from "@/server/env";
import { route, json } from "@/server/http";
import { exportAll } from "@/server/repo/transfer";

/**
 * A staff session, or the backup token for the weekly GitHub Action, which has
 * no way to complete a Discord login.
 */
function hasBackupToken(req: Request) {
  const expected = env().BACKUP_TOKEN;
  if (!expected) return false;
  const given = req.headers.get("authorization")?.replace(/^Bearer /i, "") ?? "";
  const a = Buffer.from(given);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

export const GET = route(async (req: Request) => {
  if (!hasBackupToken(req)) await requireRole("instructor");
  return json(await exportAll());
});
