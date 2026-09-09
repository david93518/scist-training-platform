/**
 * Discord webhook notifications. Used for new questions (so TAs see them in
 * the channel they already watch) and first bloods. Silent no-op when unset.
 */
import { env, features } from "../env";

export async function notifyDiscord(content: string, embeds?: unknown[]) {
  if (!features.discordWebhook()) return false;
  try {
    const res = await fetch(env().DISCORD_WEBHOOK_URL!, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ content, embeds, username: "SCIST Gate" }),
    });
    return res.ok;
  } catch {
    return false;
  }
}

export function questionMessage(q: { title: string; body: string; author: string; url: string }) {
  return {
    content: "🙋 新問題：**" + q.title + "**",
    embeds: [{ description: q.body.slice(0, 400), footer: { text: "by " + q.author }, url: q.url, color: 0x4da3ff }],
  };
}

export function firstBloodMessage(f: { handle: string; challenge: string; url: string }) {
  return {
    content: "🩸 **First Blood!** " + f.handle + " 拿下了 **" + f.challenge + "**",
    embeds: [{ url: f.url, color: 0xff5e5e }],
  };
}

const MEDAL = ["🥇", "🥈", "🥉"];

/** 每週挑戰的戰報，週結算時貼到 Discord。 */
export function weeklyReportMessage(w: {
  name: string;
  url: string;
  bonusXp: number;
  solversThisWeek: number;
  top: { rank: number; handle: string; schoolShort: string }[];
}) {
  const podium = w.top.length
    ? w.top.map((p) => MEDAL[p.rank - 1] + " **" + p.handle + "**" + (p.schoolShort ? "（" + p.schoolShort + "）" : "")).join("\n")
    : "這一週沒有人解出來，題目留到下週。";

  return {
    content: "📅 **本週挑戰結算**：" + w.name,
    embeds: [
      {
        description: podium,
        url: w.url,
        color: 0xa4f13b,
        footer: {
          text:
            "本週共 " +
            w.solversThisWeek +
            " 人解出" +
            (w.bonusXp > 0 && w.top.length ? "，前三名各得 " + w.bonusXp + " XP" : ""),
        },
      },
    ],
  };
}
