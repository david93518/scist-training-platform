/** Live platform feed. Renders as a scrolling ticker on the landing page. */
export type ActivityKind =
  | "solve"
  | "firstblood"
  | "lesson"
  | "rankup"
  | "release"
  | "join";

export interface Activity {
  id: string;
  kind: ActivityKind;
  handle: string;
  schoolShort: string;
  target: string;
  at: string;
  /** "3 分鐘前", computed when the feed is built so the component stays pure */
  ago?: string;
}

export const ACTIVITY: Activity[] = [
  { id: "f1", kind: "firstblood", handle: "ch3n", schoolShort: "南一中", target: "Cijin", at: "2026-09-08T21:41:00+08:00" },
  { id: "f2", kind: "solve", handle: "mochi", schoolShort: "屏中", target: "SUID Slip", at: "2026-09-08T21:22:00+08:00" },
  { id: "f3", kind: "lesson", handle: "hana", schoolShort: "嘉女", target: "SQL Injection 入門", at: "2026-09-08T20:58:00+08:00" },
  { id: "f4", kind: "rankup", handle: "sora", schoolShort: "屏女", target: "進階駭客", at: "2026-09-08T20:31:00+08:00" },
  { id: "f5", kind: "solve", handle: "0xkuma", schoolShort: "雄中", target: "Tcache Poisoning", at: "2026-09-08T19:47:00+08:00" },
  { id: "f6", kind: "join", handle: "yuna", schoolShort: "南女中", target: "", at: "2026-09-08T19:12:00+08:00" },
  { id: "f7", kind: "solve", handle: "peko", schoolShort: "南女中", target: "The Bakery", at: "2026-09-08T18:50:00+08:00" },
  { id: "f8", kind: "release", handle: "vex", schoolShort: "講師", target: "Cijin", at: "2026-09-08T18:00:00+08:00" },
  { id: "f9", kind: "solve", handle: "kanade", schoolShort: "雄女", target: "Follow the Stream", at: "2026-09-08T17:36:00+08:00" },
  { id: "f10", kind: "lesson", handle: "shu", schoolShort: "鳳新", target: "Linux 指令基礎", at: "2026-09-08T17:04:00+08:00" },
  { id: "f11", kind: "solve", handle: "aylin", schoolShort: "雄女", target: "ECB Oracle", at: "2026-09-08T16:29:00+08:00" },
  { id: "f12", kind: "rankup", handle: "b1t", schoolShort: "鳳新", target: "駭客", at: "2026-09-08T15:58:00+08:00" },
];

export const ACTIVITY_VERB: Record<ActivityKind, string> = {
  solve: "解出了",
  firstblood: "拿下 First Blood",
  lesson: "完成了課程",
  rankup: "晉升為",
  release: "發布了新題目",
  join: "加入了平台",
};
