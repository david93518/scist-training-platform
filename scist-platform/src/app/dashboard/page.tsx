import type { Metadata } from "next";
import { PageHero } from "@/components/ui/page-hero";
import { Dashboard } from "@/components/dashboard/dashboard";
import { getChallengesPublic, getTracksPublic } from "@/server/repo/content";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "我的進度",
  description: "你的 XP、階級、課程完成度、解題紀錄與課堂筆記。",
};

export default async function DashboardPage() {
  const [tracks, challenges] = await Promise.all([getTracksPublic(), getChallengesPublic()]);
  return (
    <main>
      <PageHero
        kicker="YOUR PROFILE"
        title="我的進度"
        desc="看課、答對檢查站、解題都會累積在這裡，跨裝置同步。"
        seed={17}
      />
      <div className="mx-auto max-w-7xl px-5 py-12">
        <Dashboard tracks={tracks} challenges={challenges} />
      </div>
    </main>
  );
}
