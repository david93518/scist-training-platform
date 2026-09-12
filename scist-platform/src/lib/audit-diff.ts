/**
 * 後台操作紀錄的欄位級比對。
 *
 * 只記「儲存了」沒辦法回推出事原因，所以存檔前後各拍一份，算出改了哪些欄位、
 * 改前改後分別是什麼，寫進 audit_log 的 detail。本機模式與真的 API 共用這份
 * 邏輯，兩邊的紀錄長得才會一樣。
 */
import type { AuditChange } from "@/admin/types";
import { CATEGORY_META } from "@/data/challenges";
import type { Checkpoint, ContentBlock } from "@/data/tracks";
import { DIFFICULTY } from "@/lib/xp";

const EMPTY = "（空白）";
/** 單一欄位存進 detail 的上限；題目說明整段塞進去會把 audit_log 撐爆 */
const MAX_VALUE = 180;
/** 一次存檔最多記幾個欄位 */
const MAX_CHANGES = 30;

type Rec = Record<string, unknown>;

function clip(s: string, max = MAX_VALUE) {
  const t = s.replace(/\s+/g, " ").trim();
  return t.length > max ? t.slice(0, max) + "…" : t;
}

function show(v: unknown): string {
  if (v === null || v === undefined || v === "") return EMPTY;
  if (typeof v === "boolean") return v ? "開" : "關";
  if (Array.isArray(v)) {
    if (v.length === 0) return EMPTY;
    if (v.every((x) => typeof x === "string" || typeof x === "number")) return clip(v.join("、"));
    return v.length + " 項";
  }
  if (typeof v === "object") return clip(JSON.stringify(v));
  return clip(String(v));
}

/** 列舉值轉中文；沒對到就原樣顯示 */
const enumOf =
  (map: Record<string, string>) =>
  (v: unknown): string => {
    if (v === null || v === undefined || v === "") return EMPTY;
    return map[String(v)] ?? String(v);
  };

const STATUS = enumOf({ draft: "草稿", published: "已發布", archived: "封存" });
const CATEGORY = enumOf(Object.fromEntries(Object.entries(CATEGORY_META).map(([k, m]) => [k, m.label])));
const LEVEL = enumOf(Object.fromEntries(Object.entries(DIFFICULTY).map(([k, m]) => [k, m.label])));
const KIND = enumOf({ challenge: "單題", box: "靶機" });
const CONNECTION = enumOf({ none: "不需連線", http: "HTTP", nc: "nc", ssh: "SSH" });
const VIDEO_PROVIDER = enumOf({ none: "沒有影片", youtube: "YouTube", stream: "Stream" });
const VIDEO_STATUS = enumOf({ none: "無", uploading: "上傳中", processing: "轉檔中", ready: "可播放", error: "錯誤" });
const EVENT_MODE = enumOf({ online: "線上", offline: "線下" });
export const ROLE = enumOf({ student: "學員", ta: "助教", instructor: "講師", admin: "管理員" });

function seconds(v: unknown) {
  const n = Number(v);
  if (!Number.isFinite(n) || n <= 0) return EMPTY;
  return Math.floor(n / 60) + " 分 " + (n % 60) + " 秒";
}

function datetime(v: unknown) {
  if (!v) return EMPTY;
  const d = new Date(String(v));
  if (Number.isNaN(d.getTime())) return String(v);
  const p = (n: number) => String(n).padStart(2, "0");
  return d.getFullYear() + "/" + p(d.getMonth() + 1) + "/" + p(d.getDate()) + " " + p(d.getHours()) + ":" + p(d.getMinutes());
}

function listOf<T>(v: unknown, one: (x: T, i: number) => string) {
  const arr = (v ?? []) as T[];
  if (!Array.isArray(arr) || arr.length === 0) return EMPTY;
  return clip(arr.map(one).join("、"));
}

const BLOCK_LABEL: Record<ContentBlock["type"], string> = { p: "段落", h: "小標", code: "程式碼", list: "清單", callout: "提示框" };

/** 內文是一堆 block，逐字比沒意義，改成報各類型各幾塊 */
function blocks(v: unknown) {
  const arr = (v ?? []) as ContentBlock[];
  if (!Array.isArray(arr) || arr.length === 0) return EMPTY;
  const count = new Map<string, number>();
  for (const b of arr) count.set(b.type, (count.get(b.type) ?? 0) + 1);
  return [...count.entries()].map(([t, n]) => (BLOCK_LABEL[t as ContentBlock["type"]] ?? t) + " " + n).join("、");
}

interface Field {
  key: string;
  label: string;
  show?: (v: unknown) => string;
}

const CHALLENGE: Field[] = [
  { key: "name", label: "題目名稱" },
  { key: "slug", label: "網址代稱" },
  { key: "category", label: "分類", show: CATEGORY },
  { key: "difficulty", label: "難度", show: LEVEL },
  { key: "kind", label: "型態", show: KIND },
  { key: "status", label: "狀態", show: STATUS },
  { key: "blurb", label: "一句話簡介" },
  { key: "description", label: "題目說明" },
  { key: "tags", label: "標籤" },
  { key: "authorId", label: "出題者" },
  { key: "tutorial", label: "教學題" },
  { key: "lessonRef", label: "對應課程" },
  { key: "connectionType", label: "連線方式", show: CONNECTION },
  { key: "connectionValue", label: "連線位址" },
  { key: "instanceImage", label: "靶機映像" },
  { key: "instancePort", label: "靶機連接埠" },
  { key: "instanceTtlMin", label: "靶機時限（分）" },
  { key: "baseSolves", label: "基礎解題數" },
  { key: "rating", label: "星等" },
  { key: "releasedAt", label: "上架時間", show: datetime },
  {
    key: "flags",
    label: "Flag",
    // 明碼不會進到這裡，用雜湊前幾碼讓「答案被換掉」看得出來
    show: (v) => listOf<{ label: string; points: number; sha256: string }>(v, (f) => f.label + "（" + f.points + " 分・答案 " + String(f.sha256 ?? "").slice(0, 8) + "）"),
  },
  { key: "hints", label: "提示", show: (v) => listOf<{ text: string; cost: number }>(v, (h, i) => i + 1 + ". " + clip(h.text, 40) + "（" + h.cost + " XP）") },
  { key: "files", label: "附件", show: (v) => listOf<{ name: string }>(v, (f) => f.name) },
];

const LESSON: Field[] = [
  { key: "title", label: "課程標題" },
  { key: "slug", label: "網址代稱" },
  { key: "status", label: "狀態", show: STATUS },
  { key: "summary", label: "摘要" },
  { key: "trackId", label: "所屬路徑" },
  { key: "moduleId", label: "所屬章節" },
  { key: "durationSec", label: "影片長度", show: seconds },
  { key: "xp", label: "完課 XP" },
  { key: "videoProvider", label: "影片來源", show: VIDEO_PROVIDER },
  { key: "videoId", label: "影片 ID" },
  { key: "videoStatus", label: "影片狀態", show: VIDEO_STATUS },
  { key: "content", label: "課程內容", show: blocks },
  { key: "checkpoints", label: "隨堂測驗", show: (v) => listOf<Checkpoint>(v, (c, i) => i + 1 + ". " + clip(c.question, 30)) },
  { key: "labSlug", label: "配套題目" },
  { key: "sortOrder", label: "排序" },
];

const TRACK: Field[] = [
  { key: "name", label: "路徑名稱" },
  { key: "en", label: "英文名稱" },
  { key: "slug", label: "網址代稱" },
  { key: "status", label: "狀態", show: STATUS },
  { key: "tagline", label: "標語" },
  { key: "outcome", label: "學習成果" },
  { key: "syllabus", label: "大綱" },
  { key: "level", label: "程度" },
  { key: "difficulty", label: "難度", show: LEVEL },
  { key: "icon", label: "圖示" },
  { key: "color", label: "主色" },
  { key: "instructorId", label: "講師" },
  { key: "sortOrder", label: "排序" },
  { key: "modules", label: "章節", show: (v) => listOf<{ title: string }>(v, (m) => m.title) },
];

const EVENT: Field[] = [
  { key: "title", label: "活動名稱" },
  { key: "type", label: "類型" },
  { key: "status", label: "狀態", show: STATUS },
  { key: "summary", label: "簡介" },
  { key: "startsAt", label: "開始時間", show: datetime },
  { key: "durationMin", label: "時長（分）" },
  { key: "mode", label: "形式", show: EVENT_MODE },
  { key: "location", label: "地點" },
  { key: "hostId", label: "主持人" },
  { key: "capacity", label: "名額" },
  { key: "baseRegistered", label: "基礎報名數" },
  { key: "tags", label: "標籤" },
];

const INSTRUCTOR: Field[] = [
  { key: "name", label: "姓名" },
  { key: "handle", label: "帳號" },
  { key: "role", label: "職稱" },
  { key: "domains", label: "專長領域" },
  { key: "bio", label: "簡介" },
  { key: "creds", label: "經歷" },
  { key: "accent", label: "主色" },
  { key: "userId", label: "綁定帳號" },
  { key: "sortOrder", label: "排序" },
];

const FIELDS: Record<string, Field[]> = { challenge: CHALLENGE, lesson: LESSON, track: TRACK, event: EVENT, instructor: INSTRUCTOR };

/** 顯示用的名字欄位，順序就是優先序 */
const NAME_KEYS = ["name", "title", "handle", "slug", "id"];

export function entityName(obj: unknown): string {
  const r = (obj ?? {}) as Rec;
  for (const k of NAME_KEYS) if (typeof r[k] === "string" && r[k]) return r[k] as string;
  return "";
}

function same(a: unknown, b: unknown) {
  if (a === b) return true;
  // null 與 undefined 與 "" 在這些表單裡都代表「沒填」
  const blank = (v: unknown) => v === null || v === undefined || v === "";
  if (blank(a) && blank(b)) return true;
  return JSON.stringify(a ?? null) === JSON.stringify(b ?? null);
}

/** 摘要型欄位（內容、提示…）兩邊摘要可能一樣但實際內容不同，講清楚免得看起來像沒改 */
function pair(before: unknown, after: unknown, fmt: (v: unknown) => string) {
  const b = fmt(before);
  const a = fmt(after);
  return { before: b, after: b === a ? a + "（細節有調整）" : a };
}

function toChange(f: Field, before: unknown, after: unknown): AuditChange {
  return { field: f.key, label: f.label, ...pair(before, after, f.show ?? show) };
}

/**
 * 比對存檔前後。`before` 是 null 代表新建，這時不列欄位（整份都是新的，列出來只是噪音）。
 */
export function diffEntity(entity: string, before: unknown, after: unknown): AuditChange[] {
  const fields = FIELDS[entity];
  if (!fields || !before || !after) return [];
  const b = before as Rec;
  const a = after as Rec;
  const out: AuditChange[] = [];
  for (const f of fields) {
    if (same(b[f.key], a[f.key])) continue;
    out.push(toChange(f, b[f.key], a[f.key]));
    if (out.length >= MAX_CHANGES) break;
  }
  return out;
}

/** 存檔要寫進 audit log 的說明與變更明細 */
export function describeSave(entity: string, before: unknown, after: unknown): { label: string; changes: AuditChange[] } {
  const name = entityName(after) || entityName(before);
  if (!before) return { label: "新增「" + name + "」", changes: [] };
  const changes = diffEntity(entity, before, after);
  if (changes.length === 0) return { label: name + "（內容沒有變更）", changes };
  const renamed = changes.find((c) => c.field === "name" || c.field === "title");
  const head = renamed ? renamed.before + " → " + renamed.after : name;
  return { label: head + " · 改了 " + changes.map((c) => c.label).join("、"), changes };
}

/** 刪除要寫進 audit log 的說明 */
export function describeDelete(before: unknown, id: string): string {
  const name = entityName(before);
  return name ? "刪除「" + name + "」" : "刪除 " + id;
}

/* ----------------------------- 站點設定 ----------------------------- */
/**
 * 設定是巢狀物件，欄位表寫不完，改用路徑對照表遞迴走一遍。
 */
const SETTING_LABELS: Record<string, string> = {
  "site.name": "站名",
  "site.tagline": "標語",
  "site.discordInvite": "Discord 邀請連結",
  "site.launch": "上線日",
  "xp.checkpointDefault": "隨堂測驗預設 XP",
  "xp.lessonDefault": "完課預設 XP",
  "xp.hintRefundOnSolve": "解題後退還提示 XP",
  "leaderboard.weekStartsOn": "排行榜每週起始日",
  "weekly.slug": "本週挑戰題目",
  "weekly.note": "本週挑戰說明",
  "weekly.bonusXp": "本週挑戰加分",
  "features.instances": "靶機功能",
  "features.questions": "問答功能",
  ranks: "等級規則",
  certifications: "認證規則",
};

/** 這兩個是物件陣列，只報「N 項」看不出改了什麼，逐項列名字與門檻 */
const SETTING_SHOW: Record<string, (v: unknown) => string> = {
  ranks: (v) => listOf<{ name: string; minXp: number }>(v, (r) => r.name + " " + r.minXp + "+"),
  certifications: (v) => listOf<{ name?: string; id: string }>(v, (c) => c.name ?? c.id),
};

export function diffSettings(before: unknown, after: unknown): AuditChange[] {
  const out: AuditChange[] = [];
  const walk = (b: unknown, a: unknown, path: string) => {
    if (out.length >= MAX_CHANGES) return;
    if (same(b, a)) return;
    const isPlain = (v: unknown) => v !== null && typeof v === "object" && !Array.isArray(v);
    if (isPlain(b) && isPlain(a) && !SETTING_LABELS[path]) {
      const keys = new Set([...Object.keys(b as Rec), ...Object.keys(a as Rec)]);
      for (const k of keys) walk((b as Rec)[k], (a as Rec)[k], path ? path + "." + k : k);
      return;
    }
    out.push({ field: path, label: SETTING_LABELS[path] ?? path, ...pair(b, a, SETTING_SHOW[path] ?? show) });
  };
  walk(before, after, "");
  return out;
}
