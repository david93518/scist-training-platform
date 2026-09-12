/**
 * 檢查站時間。後台與資料庫存「第幾秒」；示範資料與舊列還可能是 0–1 的進度比例。
 * 讀的時候用這幾個函式，不要自己乘 duration。
 *
 * 不能把 `1` 當成比例：新編輯器在 00:01 會存 `at: 1`，當成 100% 會跑到片尾。
 * 只有開區間 (0, 1) 的小數才當舊比例；0 與整數秒都照秒數讀。
 */
export function isLegacyCheckpointRatio(at: number): boolean {
  return at > 0 && at < 1;
}

export function checkpointAtSec(at: number, durationSec: number): number {
  if (isLegacyCheckpointRatio(at)) return Math.round(at * Math.max(1, durationSec));
  return Math.max(0, Math.round(at));
}

/** 播放器進度條用的 0–1。 */
export function checkpointProgress(at: number, durationSec: number): number {
  if (durationSec <= 0) return 0;
  return Math.min(1, Math.max(0, checkpointAtSec(at, durationSec) / durationSec));
}

export function formatTimecode(totalSec: number): string {
  const s = Math.max(0, Math.round(totalSec));
  const m = Math.floor(s / 60);
  const r = s % 60;
  return String(m).padStart(2, "0") + ":" + String(r).padStart(2, "0");
}
