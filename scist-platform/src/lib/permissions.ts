/**
 * 四個角色能做什麼，全平台只有這一張表。
 *
 * 以前權限散在各個 route 的 requireRole 與後台側邊欄裡，結果是講師跟管理員
 * 看到一模一樣的後台（點下去才 403），助教則是有 API 權限卻進不了後台。
 * 現在後端的 requireCap()、middleware 的擋門、側邊欄要不要出現、按鈕要不要
 * 畫出來，全部讀這裡。要調整權限就改 CAPABILITY 的那一行。
 *
 * 角色定位：
 *   學員   student    前台學習、解題、發問
 *   助教   ta         教學支援：後台集中回覆問答、處理卡住的靶機
 *   講師   instructor 內容負責：路徑／課程／題庫／活動的增修、看數據與學員名單
 *   管理員 admin      平台負責：角色與帳號、站點設定、操作紀錄、匯出
 */
export type Role = "student" | "ta" | "instructor" | "admin";

export const ROLES: Role[] = ["student", "ta", "instructor", "admin"];

export const ROLE_RANK: Record<Role, number> = { student: 0, ta: 1, instructor: 2, admin: 3 };

export const ROLE_LABEL: Record<Role, string> = {
  student: "學員",
  ta: "助教",
  instructor: "講師",
  admin: "管理員",
};

export const ROLE_COLOR: Record<Role, string> = {
  student: "#a9b6c6",
  ta: "#4da3ff",
  instructor: "#a4f13b",
  admin: "#ffb84d",
};

/** 每個能力最低需要的角色 */
export const CAPABILITY = {
  /** 後台首頁以外，至少要有一個能力才進得去 */
  "admin.enter": "ta",
  /** 後台總覽（全站數字、草稿數、卡關點） */
  "overview.read": "instructor",

  /** 路徑、課程、題庫、活動、講師資料 */
  "content.read": "instructor",
  "content.write": "instructor",
  "content.delete": "instructor",
  /** 砍掉整條路徑或一位講師會連動很多東西，留給管理員 */
  "track.delete": "admin",
  "instructor.delete": "admin",
  /** 匯入的介面在管理員專屬的設定頁裡，權限就跟著那一頁走 */
  "content.import": "admin",

  /** 學員名單與個別學員的學習紀錄 */
  "users.read": "instructor",
  /** 改角色、停權、調 XP、重設密碼 */
  "users.manage": "admin",

  "questions.read": "ta",
  "questions.answer": "ta",
  "questions.delete": "instructor",

  "instances.read": "ta",
  "instances.kill": "ta",
  "instances.killAll": "instructor",

  "analytics.read": "instructor",
  /** 各項整合有沒有設定好；靶機頁要用它判斷 instancer 在不在 */
  "status.read": "ta",
  "weekly.settle": "instructor",

  "settings.read": "admin",
  "settings.write": "admin",
  "audit.read": "admin",
  "export.read": "admin",
} as const satisfies Record<string, Role>;

export type Capability = keyof typeof CAPABILITY;

export function can(role: Role | string | null | undefined, cap: Capability) {
  const rank = ROLE_RANK[role as Role];
  return rank !== undefined && rank >= ROLE_RANK[CAPABILITY[cap]];
}

/** 這個能力最低要哪個角色，用來寫錯誤訊息 */
export function minRoleFor(cap: Capability): Role {
  return CAPABILITY[cap];
}

/**
 * 後台每個頁面要哪個能力。middleware 與側邊欄共用，兩邊才不會不同步。
 * 順序就是側邊欄的順序，也決定了進 /admin 時各角色的落地頁。
 */
export interface AdminPage {
  href: string;
  cap: Capability;
  /** 只有 /admin 自己算命中，底下的子路徑不算 */
  exact?: boolean;
}

export const ADMIN_PAGES: AdminPage[] = [
  { href: "/admin", cap: "overview.read", exact: true },
  { href: "/admin/tracks", cap: "content.read" },
  { href: "/admin/lessons", cap: "content.read" },
  { href: "/admin/challenges", cap: "content.read" },
  { href: "/admin/events", cap: "content.read" },
  { href: "/admin/instructors", cap: "content.read" },
  { href: "/admin/users", cap: "users.read" },
  { href: "/admin/questions", cap: "questions.read" },
  { href: "/admin/instances", cap: "instances.read" },
  { href: "/admin/analytics", cap: "analytics.read" },
  { href: "/admin/audit", cap: "audit.read" },
  { href: "/admin/settings", cap: "settings.read" },
];

export function capForAdminPath(pathname: string): Capability | null {
  if (pathname === "/admin" || pathname === "/admin/") return "overview.read";
  // 最長前綴優先，/admin/challenges/xxx 才不會被 /admin 吃掉
  const hit = [...ADMIN_PAGES]
    .filter((p) => !p.exact && pathname.startsWith(p.href))
    .sort((a, b) => b.href.length - a.href.length)[0];
  return hit?.cap ?? null;
}

/** 這個角色進後台時該落在哪一頁 */
export function landingFor(role: Role | string | null | undefined) {
  return ADMIN_PAGES.find((p) => can(role, p.cap))?.href ?? null;
}
