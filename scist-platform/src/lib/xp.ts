/**
 * Rank ladder. XP thresholds are cumulative.
 * Names are SCIST's own; the shape (7 ranks, progress-to-next) mirrors
 * what CTF players already understand.
 */
export interface Rank {
  id: string;
  name: string;
  en: string;
  minXp: number;
  color: string;
  blurb: string;
}

export const RANKS: Rank[] = [
  { id: "newbie", name: "新手", en: "Newbie", minXp: 0, color: "#a9b6c6", blurb: "剛推開第一道門" },
  { id: "apprentice", name: "見習生", en: "Apprentice", minXp: 300, color: "#4da3ff", blurb: "會用工具、看得懂 request" },
  { id: "hacker", name: "駭客", en: "Hacker", minXp: 1000, color: "#a4f13b", blurb: "能獨立解入門題" },
  { id: "pro", name: "進階駭客", en: "Pro Hacker", minXp: 2500, color: "#3ee8d5", blurb: "跨兩個以上領域" },
  { id: "elite", name: "菁英駭客", en: "Elite Hacker", minXp: 5000, color: "#b983ff", blurb: "AIS3 Pre-Exam 前 75 名等級" },
  { id: "guru", name: "導師", en: "Guru", minXp: 9000, color: "#ffb84d", blurb: "能出題、能帶人" },
  { id: "legend", name: "傳說", en: "Legend", minXp: 15000, color: "#ff6fb5", blurb: "18 校聯防都知道的名字" },
];

export function rankFor(xp: number): Rank {
  let r = RANKS[0];
  for (const rank of RANKS) if (xp >= rank.minXp) r = rank;
  return r;
}

export function nextRank(xp: number): Rank | null {
  const idx = RANKS.findIndex((r) => r.id === rankFor(xp).id);
  return RANKS[idx + 1] ?? null;
}

/** 0..1 progress from current rank to the next */
export function rankProgress(xp: number) {
  const cur = rankFor(xp);
  const nxt = nextRank(xp);
  if (!nxt) return 1;
  return (xp - cur.minXp) / (nxt.minXp - cur.minXp);
}

export const DIFFICULTY = {
  easy: { label: "簡單", en: "Easy", color: "#7be43d", points: 100 },
  medium: { label: "中等", en: "Medium", color: "#ffb84d", points: 250 },
  hard: { label: "困難", en: "Hard", color: "#ff5e5e", points: 500 },
  insane: { label: "瘋狂", en: "Insane", color: "#c47eff", points: 900 },
} as const;
export type Difficulty = keyof typeof DIFFICULTY;
