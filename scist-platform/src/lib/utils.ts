import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Formatting here deliberately avoids Intl. Node and the browser ship
 * different ICU builds, and zh-TW date patterns differ between them (Node
 * separates the date and time with U+2009, Chrome with a plain space), which
 * shows up as a React hydration mismatch. Building the strings by hand keeps
 * the server and client output identical.
 */

const WEEKDAY = ["日", "一", "二", "三", "四", "五", "六"];

interface DateParts {
  y: number;
  mo: number;
  d: number;
  h: number;
  mi: number;
}

/**
 * Reads the literal calendar fields out of an ISO string. Every timestamp in
 * this project is authored with an explicit +08:00 offset, so the literal
 * fields are already Taipei time and do not depend on the runtime's timezone.
 */
function isoParts(iso: string): DateParts {
  const m = /^(\d{4})-(\d{2})-(\d{2})(?:[T ](\d{2}):(\d{2}))?/.exec(iso);
  if (!m) {
    const d = new Date(iso);
    return {
      y: d.getFullYear(),
      mo: d.getMonth() + 1,
      d: d.getDate(),
      h: d.getHours(),
      mi: d.getMinutes(),
    };
  }
  return {
    y: Number(m[1]),
    mo: Number(m[2]),
    d: Number(m[3]),
    h: m[4] ? Number(m[4]) : 0,
    mi: m[5] ? Number(m[5]) : 0,
  };
}

function weekdayOf(p: DateParts) {
  // Date.UTC keeps this independent of the runtime timezone
  return WEEKDAY[new Date(Date.UTC(p.y, p.mo - 1, p.d)).getUTCDay()];
}

function pad2(n: number) {
  return n < 10 ? "0" + n : String(n);
}

export function formatNumber(n: number) {
  const negative = n < 0;
  const digits = String(Math.abs(Math.round(n)));
  let out = "";
  for (let i = 0; i < digits.length; i++) {
    if (i > 0 && (digits.length - i) % 3 === 0) out += ",";
    out += digits[i];
  }
  return (negative ? "-" : "") + out;
}

export function formatDuration(totalSeconds: number) {
  const m = Math.floor(totalSeconds / 60);
  const s = Math.floor(totalSeconds % 60);
  return m + ":" + pad2(s);
}

export function formatMinutes(totalSeconds: number) {
  return "約 " + Math.round(totalSeconds / 60) + " 分鐘";
}

/** "1月15日（週四）" */
export function formatDate(iso: string) {
  const p = isoParts(iso);
  return p.mo + "月" + p.d + "日（週" + weekdayOf(p) + "）";
}

/** "9/13（週日） 14:00" */
export function formatDateTime(iso: string) {
  const p = isoParts(iso);
  return (
    p.mo + "/" + p.d + "（週" + weekdayOf(p) + "） " + pad2(p.h) + ":" + pad2(p.mi)
  );
}

export function relativeTime(iso: string, now = Date.now()) {
  const diff = (now - new Date(iso).getTime()) / 1000;
  if (diff < 60) return "剛剛";
  if (diff < 3600) return Math.floor(diff / 60) + " 分鐘前";
  if (diff < 86400) return Math.floor(diff / 3600) + " 小時前";
  if (diff < 86400 * 30) return Math.floor(diff / 86400) + " 天前";
  const p = isoParts(iso);
  return p.y + "/" + p.mo + "/" + p.d;
}

export function clamp(n: number, min: number, max: number) {
  return Math.min(max, Math.max(min, n));
}

/** Deterministic pseudo-random for stable mock data */
export function seeded(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 0xffffffff;
  };
}
