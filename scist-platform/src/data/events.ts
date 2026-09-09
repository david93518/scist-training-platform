/**
 * The 翻轉教室 loop: 線上自學 + 線下解惑.
 * Bug 診療室 runs monthly, instructors go live weekly, SCIST 盃 is annual.
 */
export type EventType = "clinic" | "live" | "contest" | "workshop";

export const EVENT_META: Record<
  EventType,
  { label: string; color: string; icon: string }
> = {
  clinic: { label: "Bug 診療室", color: "#a4f13b", icon: "Stethoscope" },
  live: { label: "講師直播", color: "#4da3ff", icon: "Radio" },
  contest: { label: "競賽", color: "#ffb84d", icon: "Trophy" },
  workshop: { label: "工作坊", color: "#b983ff", icon: "Hammer" },
};

export interface SciEvent {
  id: string;
  type: EventType;
  title: string;
  summary: string;
  startsAt: string;
  durationMin: number;
  mode: "線下" | "線上";
  location: string;
  hostId: string;
  capacity: number;
  registered: number;
  tags: string[];
}

export const EVENTS: SciEvent[] = [
  {
    id: "e1",
    type: "clinic",
    title: "Bug 診療室 · 台南場",
    summary: "帶著你卡住的那一題來。助教一對一陪你除錯，不直接給答案，只給下一步。",
    startsAt: "2026-09-13T14:00:00+08:00",
    durationMin: 180,
    mode: "線下",
    location: "台南 · 南一中資訊教室",
    hostId: "n0ir",
    capacity: 40,
    registered: 34,
    tags: ["除錯", "面對面", "每月"],
  },
  {
    id: "e2",
    type: "live",
    title: "直播解題 · 本週 Web 挑戰",
    summary: "n0ir 現場開螢幕，把這週的 Web 題從探測打到 flag，全程可以在聊天室發問。",
    startsAt: "2026-09-11T20:00:00+08:00",
    durationMin: 90,
    mode: "線上",
    location: "Discord · stage 頻道",
    hostId: "n0ir",
    capacity: 500,
    registered: 218,
    tags: ["直播", "Web", "可發問"],
  },
  {
    id: "e3",
    type: "workshop",
    title: "助教工作坊 · 怎麼引導而不是給答案",
    summary: "18 校社團幹部專屬。教你用觀念提示、方向引導、驗證思路三步驟帶學弟妹。",
    startsAt: "2026-09-20T10:00:00+08:00",
    durationMin: 240,
    mode: "線下",
    location: "高雄 · 雄中",
    hostId: "tux",
    capacity: 30,
    registered: 27,
    tags: ["助教培訓", "SOP"],
  },
  {
    id: "e4",
    type: "contest",
    title: "SCIST 盃 · 校際資安競賽",
    summary: "年度大賽。以校為單位組隊，前三名可優先報名下一季的進階課程。",
    startsAt: "2026-10-18T09:00:00+08:00",
    durationMin: 480,
    mode: "線上",
    location: "線上賽制 · 全台開放",
    hostId: "vex",
    capacity: 600,
    registered: 412,
    tags: ["年度賽事", "組隊", "獎金"],
  },
  {
    id: "e5",
    type: "live",
    title: "直播解題 · Crypto 專場",
    summary: "moka 帶你把 RSA 的三個經典弱點一次講完，順便破三題。",
    startsAt: "2026-09-18T20:00:00+08:00",
    durationMin: 90,
    mode: "線上",
    location: "Discord · stage 頻道",
    hostId: "moka",
    capacity: 500,
    registered: 143,
    tags: ["直播", "Crypto"],
  },
  {
    id: "e6",
    type: "clinic",
    title: "Bug 診療室 · 高雄場",
    summary: "同樣的形式，換到高雄。屏東的同學搭火車也來得及。",
    startsAt: "2026-09-27T14:00:00+08:00",
    durationMin: 180,
    mode: "線下",
    location: "高雄 · 雄中資訊社辦",
    hostId: "vex",
    capacity: 40,
    registered: 19,
    tags: ["除錯", "面對面", "每月"],
  },
];

/** Next few events from any list; falls back to the latest past ones when nothing is scheduled. */
export function upcomingOf(list: SciEvent[], count = 3, now = Date.now()) {
  const upcoming = list.filter((e) => new Date(e.startsAt).getTime() >= now - 3 * 3600_000).sort((a, b) => a.startsAt.localeCompare(b.startsAt));
  return (upcoming.length ? upcoming : [...list].sort((a, b) => b.startsAt.localeCompare(a.startsAt))).slice(0, count);
}

export function upcomingEvents(now = Date.now()) {
  return [...EVENTS]
    .filter((e) => new Date(e.startsAt).getTime() >= now)
    .sort((a, b) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime());
}
