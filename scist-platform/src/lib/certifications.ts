/**
 * 學員三級認證（入門 / 進階 / 菁英）。
 *
 * 跟 xp.ts 的七級階級是兩回事：階級是累積 XP 的遊戲化分數，認證是企劃書
 * 第 111-124 行那張表，條件是「完成了哪些課、解了幾題、擔任什麼角色」，
 * 每一級都對到一個外部競賽目標，談補助時要拿得出來。
 *
 * 條件存在 settings.certifications，後台可改，所以這裡只負責判定。
 */

/** 認證條件用得到的角色，由低到高。與 src/server/auth.ts 的 Role 同一組字串。 */
export const CERT_ROLES = ["student", "ta", "instructor", "admin"] as const;
export type CertRole = (typeof CERT_ROLES)[number];

const ROLE_RANK: Record<CertRole, number> = { student: 0, ta: 1, instructor: 2, admin: 3 };
const ROLE_LABEL: Record<CertRole, string> = { student: "學員", ta: "助教", instructor: "講師", admin: "管理員" };

export interface CertRequirement {
  /** 這些路徑（slug）必須整條完課 */
  tracks?: string[];
  /** 任意幾條路徑完課 */
  trackCount?: number;
  /** 累計完成幾堂課 */
  lessons?: number;
  /** 累計解出幾題（所有 flag 都交齊才算） */
  solves?: number;
  /** platform 角色至少要到這一級 */
  role?: CertRole;
}

export interface CertRule {
  id: string;
  name: string;
  en: string;
  color: string;
  /** 能力指標 */
  blurb: string;
  /** 對應競賽目標 */
  goal: string;
  requires: CertRequirement;
}

/** 判定認證需要知道的一切，前後台都湊得出來。 */
export interface CertStats {
  /** 已完課的路徑 slug */
  completedTracks: string[];
  /** 完成的課程總數 */
  lessons: number;
  /** 解齊所有 flag 的題目數 */
  solves: number;
  role: CertRole;
}

/** 單一條件的達成情形，直接拿去畫「還差什麼」。 */
export interface CertCheck {
  label: string;
  have: number;
  need: number;
  done: boolean;
}

export interface CertStatus {
  rule: CertRule;
  checks: CertCheck[];
  earned: boolean;
  /** 0..1，已達成的條件比例 */
  progress: number;
}

export const DEFAULT_CERTIFICATIONS: CertRule[] = [
  {
    id: "foundation",
    name: "入門",
    en: "Foundation",
    color: "#4da3ff",
    blurb: "完成 Linux 基礎 + 任一領域入門課程",
    goal: "MyFirstCTF 參賽",
    requires: { tracks: ["linux-misc"], trackCount: 2, solves: 1 },
  },
  {
    id: "advanced",
    name: "進階",
    en: "Advanced",
    color: "#a4f13b",
    blurb: "完成 3 個以上領域課程，具備解題能力",
    goal: "AIS3 Pre-Exam 前 75 名",
    requires: { trackCount: 3, solves: 6 },
  },
  {
    id: "elite",
    name: "菁英",
    en: "Elite",
    color: "#b983ff",
    blurb: "全五領域精通，具備出題與教學能力",
    goal: "成為 SCIST 講師 / 助教",
    requires: {
      tracks: ["web-security", "cryptography", "reverse-engineering", "pwnable", "linux-misc"],
      solves: 12,
      role: "ta",
    },
  },
];

/** 後台可以刪光，那就退回內建的三級。 */
export function certLadder(certifications?: CertRule[] | null): CertRule[] {
  return certifications?.length ? certifications : DEFAULT_CERTIFICATIONS;
}

/**
 * 把一條規則拆成一列可以逐項顯示的條件。
 *
 * `trackNameOf` 是給指定路徑用的，讓「還差 網頁安全」比「還差 web-security」
 * 好讀；查不到就原樣顯示 slug。
 */
export function checksFor(rule: CertRule, stats: CertStats, trackNameOf?: (slug: string) => string | undefined): CertCheck[] {
  const { requires } = rule;
  const checks: CertCheck[] = [];

  for (const slug of requires.tracks ?? []) {
    const done = stats.completedTracks.includes(slug);
    checks.push({ label: "完成「" + (trackNameOf?.(slug) ?? slug) + "」", have: done ? 1 : 0, need: 1, done });
  }

  if (requires.trackCount) {
    const have = stats.completedTracks.length;
    checks.push({ label: "完成 " + requires.trackCount + " 條學習路徑", have, need: requires.trackCount, done: have >= requires.trackCount });
  }

  if (requires.lessons) {
    checks.push({ label: "完成 " + requires.lessons + " 堂課", have: stats.lessons, need: requires.lessons, done: stats.lessons >= requires.lessons });
  }

  if (requires.solves) {
    checks.push({ label: "解出 " + requires.solves + " 題", have: stats.solves, need: requires.solves, done: stats.solves >= requires.solves });
  }

  if (requires.role) {
    const done = ROLE_RANK[stats.role] >= ROLE_RANK[requires.role];
    checks.push({ label: "成為" + ROLE_LABEL[requires.role] + "以上", have: done ? 1 : 0, need: 1, done });
  }

  return checks;
}

export function evaluateCertifications(
  stats: CertStats,
  certifications?: CertRule[] | null,
  trackNameOf?: (slug: string) => string | undefined,
): CertStatus[] {
  return certLadder(certifications).map((rule) => {
    const checks = checksFor(rule, stats, trackNameOf);
    // 沒設任何條件的規則視為未達成，否則後台清空條件會讓所有人都拿到
    const earned = checks.length > 0 && checks.every((c) => c.done);
    const progress = checks.length ? checks.filter((c) => c.done).length / checks.length : 0;
    return { rule, checks, earned, progress };
  });
}

/** 目前拿到的最高一級；照設定的排列順序，由後往前找第一個達成的。 */
export function highestCert(statuses: CertStatus[]): CertStatus | null {
  for (let i = statuses.length - 1; i >= 0; i--) {
    if (statuses[i].earned) return statuses[i];
  }
  return null;
}

/** 下一個還沒拿到的，用來顯示「還差什麼」。 */
export function nextCert(statuses: CertStatus[]): CertStatus | null {
  return statuses.find((s) => !s.earned) ?? null;
}
