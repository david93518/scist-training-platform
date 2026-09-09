import type { Metadata } from "next";
import { PageHero } from "@/components/ui/page-hero";
import { Board } from "@/components/leaderboard/board";
import { SCHOOLS } from "@/data/schools";
import { getPlayersPublic, getSiteStats, schoolStandings } from "@/server/repo/site";
import { getSettings } from "@/server/repo/settings";
import { formatNumber } from "@/lib/utils";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "排行榜",
  description: "SCIST Gate 排行榜。個人週榜、歷史總榜，以及 18 校聯防的學校積分排名。",
};

const WEEKDAY = ["週日", "週一", "週二", "週三", "週四", "週五", "週六"];

export default async function LeaderboardPage() {
  const settings = await getSettings();
  const [players, stats] = await Promise.all([getPlayersPublic(settings.leaderboard.weekStartsOn), getSiteStats()]);
  const resetDay = WEEKDAY[settings.leaderboard.weekStartsOn] ?? "週日";
  return (
    <main>
      <PageHero
        kicker="LEADERBOARD"
        title="排行榜"
        desc={"個人榜看你自己走多遠，學校榜看你的社團在 18 校裡站在哪。週榜每" + resetDay + "重置，所以永遠有翻盤的機會。"}
        color="#ffb84d"
        seed={13}
        stats={[
          { value: formatNumber(stats.users), label: "註冊學員" },
          { value: players.length, label: "上榜學員" },
          { value: SCHOOLS.length, label: "聯防學校" },
        ]}
      />
      <div className="mx-auto max-w-7xl px-5 py-12">
        <Board players={players} schools={schoolStandings(players)} resetDay={resetDay} />
      </div>
    </main>
  );
}
