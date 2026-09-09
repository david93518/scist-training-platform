/**
 * 全站日曆用台北時間。週榜、連續登入、本週挑戰都讀這裡，
 * 不要再用 Date#setHours 或手動 +8 小時——那兩個看的是伺服器時區。
 *
 * 台灣沒有 DST，所以「某日 00:00」換算一次就穩。
 */
export const TZ = "Asia/Taipei";

const WEEKDAY_SHORT = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] as const;

const dateFmt = new Intl.DateTimeFormat("en-CA", {
  timeZone: TZ,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

const weekdayFmt = new Intl.DateTimeFormat("en-US", { timeZone: TZ, weekday: "short" });

const wallFmt = new Intl.DateTimeFormat("en-US", {
  timeZone: TZ,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
  hourCycle: "h23",
});

/** 該瞬間在台北的日曆日，YYYY-MM-DD */
export function calendarDate(at: Date | number = Date.now()): string {
  return dateFmt.format(new Date(at));
}

/** 該瞬間在台北的星期，0 = 週日 … 6 = 週六（跟 Date#getDay 同一套） */
export function weekday(at: Date | number = Date.now()): number {
  const name = weekdayFmt.format(new Date(at));
  const idx = WEEKDAY_SHORT.indexOf(name as (typeof WEEKDAY_SHORT)[number]);
  return idx === -1 ? 0 : idx;
}

/** 台北日曆日加減天數，回 YYYY-MM-DD。在日曆空間算，不走伺服器時區。 */
export function addCalendarDays(date: string, days: number): string {
  const t = Date.parse(date + "T00:00:00Z") + days * 86_400_000;
  return new Date(t).toISOString().slice(0, 10);
}

function tzOffsetMs(instant: number): number {
  const parts = Object.fromEntries(
    wallFmt.formatToParts(new Date(instant)).filter((p) => p.type !== "literal").map((p) => [p.type, p.value]),
  ) as Record<string, string>;
  const asUtc = Date.UTC(
    Number(parts.year),
    Number(parts.month) - 1,
    Number(parts.day),
    Number(parts.hour),
    Number(parts.minute),
    Number(parts.second),
  );
  return asUtc - instant;
}

/** 台北時間 `YYYY-MM-DD` 當天 00:00 的瞬間 */
export function startOfDay(date: string): Date {
  const [y, m, d] = date.split("-").map(Number);
  const utcMidnight = Date.UTC(y, m - 1, d);
  return new Date(utcMidnight - tzOffsetMs(utcMidnight));
}

/**
 * 包含 `at` 的那一週、在台北的起點。
 * `weekStartsOn` 跟後台設定一樣：0 週日 … 6 週六。
 */
export function weekStart(weekStartsOn: number, at: Date | number = Date.now()): Date {
  const day = weekday(at);
  const diff = (day - weekStartsOn + 7) % 7;
  return new Date(startOfDay(calendarDate(at)).getTime() - diff * 86_400_000);
}
