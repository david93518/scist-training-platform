/**
 * Flag checking for guests. Signed-in learners go through
 * POST /api/challenges/{slug}/attempt, which records the attempt, awards XP
 * and detects first blood. Guests only have the published SHA-256 digests,
 * so the comparison happens here in the browser and nothing is recorded.
 */
import type { Challenge } from "@/data/challenges";
import { sha256Hex, normalizeFlag } from "@/lib/hash";

export interface AttemptResult {
  status: "correct" | "incorrect" | "already_solved";
  message: string;
  flagId?: string;
  points?: number;
  firstBlood?: boolean;
  /** hint XP handed back once the challenge is fully solved */
  refunded?: number;
}

export async function checkFlagLocally(challenge: Challenge, submission: string): Promise<AttemptResult> {
  const hash = await sha256Hex(normalizeFlag(submission));
  const hit = challenge.flags.find((f) => f.sha256 === hash);
  if (!hit) return { status: "incorrect", message: "Flag 不對。檢查格式：SCIST{...}，大小寫要一樣。" };
  return { status: "correct", message: hit.id === "root" ? "Root 拿下！" : "正確！", flagId: hit.id, points: hit.points };
}
