/**
 * Shipped defaults for the admin settings.
 *
 * Lives in lib/ (not server/repo/) so client components can fall back to the
 * same values when they render outside a SettingsProvider.
 */
import { RANKS } from "./xp";
import { DEFAULT_CERTIFICATIONS } from "./certifications";
import type { AdminSettings } from "@/admin/types";

export const DEFAULT_SETTINGS: AdminSettings = {
  site: { name: "SCIST Gate", tagline: "資安的第一道門", discordInvite: "https://discord.gg/scist", launch: "2026-10" },
  ranks: RANKS.map((r) => ({ id: r.id, name: r.name, en: r.en, minXp: r.minXp, color: r.color, blurb: r.blurb })),
  certifications: DEFAULT_CERTIFICATIONS,
  xp: { checkpointDefault: 25, lessonDefault: 80, hintRefundOnSolve: false },
  leaderboard: { weekStartsOn: 0 },
  // 出貨時先指一題，開學前在後台換掉；清成空字串整個區塊就不出現
  weekly: { slug: "sqli-login", note: "每週一換題。這一週最快解出的前三名，週日在 Discord 公告表揚並加分。", bonusXp: 100 },
  features: { instances: true, questions: true },
};
