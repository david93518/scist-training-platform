/**
 * 檢查站時間。新資料存「第幾秒」；舊資料是 0–1 的進度比例。
 * 讀的時候用這幾個函式，不要自己乘 duration。
 */
export function checkpointAtSec(at: number, durationSec: number): number {
  if (at > 0 && at <= 1) return Math.round(at * Math.max(1, durationSec));
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
