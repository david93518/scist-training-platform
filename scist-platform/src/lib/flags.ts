/**
 * Flags are only ever checked on the server: POST /api/challenges/{slug}/attempt
 * records the attempt, awards XP and detects first blood. The browser never
 * receives a flag or its digest, so there is nothing to compare locally.
 */
export interface AttemptResult {
  status: "correct" | "incorrect" | "already_solved";
  message: string;
  flagId?: string;
  points?: number;
  firstBlood?: boolean;
  /** hint XP handed back once the challenge is fully solved */
  refunded?: number;
}
