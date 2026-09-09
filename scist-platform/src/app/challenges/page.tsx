import type { Metadata } from "next";
import { PageHero } from "@/components/ui/page-hero";
import { Arena } from "@/components/challenges/arena";
import { WeeklyChallengeBanner } from "@/components/challenges/weekly-challenge";
import { getChallengesPublic } from "@/server/repo/content";
import { getWeeklyChallenge } from "@/server/repo/site";
import { getSettingsSafe } from "@/server/repo/settings";
import { formatNumber } from "@/lib/utils";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "題庫",
  description:
    "SCIST Gate 實戰題庫。Web、Crypto、Reverse、Pwn、Linux、Misc 六大類，含完整靶機。24 小時開放，隨時可以戳。",
};

export default async function ChallengesPage() {
  const settings = await getSettingsSafe();
  const [challenges, weekly] = await Promise.all([
    getChallengesPublic(),
    getWeeklyChallenge(settings.weekly, settings.leaderboard.weekStartsOn),
  ]);
  const categories = new Set(challenges.map((c) => c.category)).size;
  return (
    <main>
      <PageHero
        kicker="THE ARENA"
        title="題庫"
        desc="每一題都有獨立的環境，24 小時開著。從送分的教學題，到會花掉你一整個週末的 heap 題。解出來就記在你的檔案裡，還能搶 First Blood。"
        seed={9}
        stats={[
          { value: challenges.length, label: "上線題目" },
          { value: categories, label: "類別" },
          { value: challenges.filter((c) => c.kind === "box").length, label: "完整靶機" },
          { value: formatNumber(challenges.reduce((n, c) => n + c.points, 0)), label: "總分" },
        ]}
      />
      <div className="mx-auto flex max-w-7xl flex-col gap-10 px-5 py-12">
        {weekly ? <WeeklyChallengeBanner weekly={weekly} /> : null}
        <Arena challenges={challenges} />
      </div>
    </main>
  );
}
