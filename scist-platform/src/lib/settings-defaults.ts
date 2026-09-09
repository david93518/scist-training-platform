/**
 * Shipped defaults for the admin settings.
 *
 * Lives in lib/ (not server/repo/) so client components can fall back to the
 * same values when they render outside a SettingsProvider.
 */
import { RANKS } from "./xp";
import type { AdminSettings } from "@/admin/types";

export const DEFAULT_SETTINGS: AdminSettings = {
  site: { name: "SCIST Gate", tagline: "資安的第一道門", discordInvite: "https://discord.gg/scist", launch: "2026-10" },
  ranks: RANKS.map((r) => ({ id: r.id, name: r.name, en: r.en, minXp: r.minXp, color: r.color, blurb: r.blurb })),
  xp: { checkpointDefault: 25, lessonDefault: 80, hintRefundOnSolve: false },
  leaderboard: { weekStartsOn: 0 },
  features: { guestProgress: true, instances: true, questions: true },
};
