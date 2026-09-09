/** Leaderboard roster. Fictional handles for the demo. */
export interface Player {
  id: string;
  handle: string;
  schoolId: string;
  xp: number;
  weeklyXp: number;
  solves: number;
  streak: number;
  /** optional hue override for the identicon avatar */
  hue?: number;
  title?: string;
  isAssistant?: boolean;
}

export const PLAYERS: Player[] = [
  { id: "p1", handle: "0xkuma", schoolId: "khjh", xp: 16420, weeklyXp: 1180, solves: 26, streak: 41, hue: 92, title: "18 校聯防都知道的名字", isAssistant: true },
  { id: "p2", handle: "ch3n", schoolId: "tnfsh", xp: 15310, weeklyXp: 1340, solves: 25, streak: 33, hue: 168, title: "First Blood 收集者", isAssistant: true },
  { id: "p3", handle: "aylin", schoolId: "kghs", xp: 11980, weeklyXp: 980, solves: 24, streak: 28, isAssistant: true },
  { id: "p4", handle: "n1ght0wl", schoolId: "tnfsh", xp: 9740, weeklyXp: 860, solves: 23, streak: 19 },
  { id: "p5", handle: "sh1n", schoolId: "cysh", xp: 8630, weeklyXp: 1020, solves: 22, streak: 24, isAssistant: true },
  { id: "p6", handle: "peko", schoolId: "tngs", xp: 7910, weeklyXp: 740, solves: 21, streak: 15 },
  { id: "p7", handle: "r00tbeer", schoolId: "kmvs", xp: 7250, weeklyXp: 690, solves: 20, streak: 12 },
  { id: "p8", handle: "mochi", schoolId: "ptsh", xp: 6480, weeklyXp: 910, solves: 19, streak: 22 },
  { id: "p9", handle: "v0id", schoolId: "smsh", xp: 6120, weeklyXp: 520, solves: 19, streak: 9 },
  { id: "p10", handle: "tako", schoolId: "tnssh", xp: 5870, weeklyXp: 780, solves: 18, streak: 17 },
  { id: "p11", handle: "yuzu", schoolId: "cygsh", xp: 5340, weeklyXp: 640, solves: 17, streak: 11 },
  { id: "p12", handle: "b1t", schoolId: "fzsh", xp: 4980, weeklyXp: 430, solves: 16, streak: 7 },
  { id: "p13", handle: "kanade", schoolId: "kghs", xp: 4610, weeklyXp: 720, solves: 16, streak: 14 },
  { id: "p14", handle: "seg", schoolId: "khjh", xp: 4270, weeklyXp: 380, solves: 15, streak: 6 },
  { id: "p15", handle: "haru", schoolId: "tnvs", xp: 3950, weeklyXp: 560, solves: 14, streak: 10 },
  { id: "p16", handle: "nu11", schoolId: "nksh", xp: 3620, weeklyXp: 340, solves: 13, streak: 5 },
  { id: "p17", handle: "sora", schoolId: "ptgs", xp: 3280, weeklyXp: 610, solves: 13, streak: 13 },
  { id: "p18", handle: "kiwi", schoolId: "cjhs", xp: 2940, weeklyXp: 290, solves: 12, streak: 4 },
  { id: "p19", handle: "0v3rfl0w", schoolId: "cyvs", xp: 2710, weeklyXp: 470, solves: 11, streak: 8 },
  { id: "p20", handle: "mint", schoolId: "cmsh", xp: 2380, weeklyXp: 250, solves: 10, streak: 3 },
  { id: "p21", handle: "gura", schoolId: "tngs", xp: 2050, weeklyXp: 390, solves: 9, streak: 6 },
  { id: "p22", handle: "xor3d", schoolId: "cvsh", xp: 1820, weeklyXp: 210, solves: 8, streak: 2 },
  { id: "p23", handle: "pipi", schoolId: "smsh", xp: 1540, weeklyXp: 330, solves: 8, streak: 5 },
  { id: "p24", handle: "lain", schoolId: "tnfsh", xp: 1290, weeklyXp: 180, solves: 7, streak: 2 },
  { id: "p25", handle: "coco", schoolId: "ptsh", xp: 1040, weeklyXp: 260, solves: 6, streak: 4 },
  { id: "p26", handle: "nori", schoolId: "cysh", xp: 860, weeklyXp: 140, solves: 5, streak: 1 },
  { id: "p27", handle: "shu", schoolId: "fzsh", xp: 620, weeklyXp: 190, solves: 4, streak: 3 },
  { id: "p28", handle: "mimi", schoolId: "kmvs", xp: 480, weeklyXp: 120, solves: 3, streak: 2 },
  { id: "p29", handle: "toto", schoolId: "nksh", xp: 310, weeklyXp: 90, solves: 3, streak: 1 },
  { id: "p30", handle: "hana", schoolId: "cygsh", xp: 180, weeklyXp: 60, solves: 2, streak: 1 },
];

export function byAllTime() {
  return [...PLAYERS].sort((a, b) => b.xp - a.xp);
}

export function byWeekly() {
  return [...PLAYERS].sort((a, b) => b.weeklyXp - a.weeklyXp);
}

export interface SchoolStanding {
  schoolId: string;
  xp: number;
  members: number;
  solves: number;
}

export function bySchool(): SchoolStanding[] {
  const map = new Map<string, SchoolStanding>();
  for (const p of PLAYERS) {
    const cur = map.get(p.schoolId) ?? { schoolId: p.schoolId, xp: 0, members: 0, solves: 0 };
    cur.xp += p.xp;
    cur.members += 1;
    cur.solves += p.solves;
    map.set(p.schoolId, cur);
  }
  return [...map.values()].sort((a, b) => b.xp - a.xp);
}

export const TOTAL_PLAYERS = 2147;
export const MONTHLY_ACTIVE = 863;
