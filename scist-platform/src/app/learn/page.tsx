import type { Metadata } from "next";
import Link from "next/link";
import { PageHero } from "@/components/ui/page-hero";
import { TrackList } from "@/components/learn/track-list";
import { trackLessonCount, trackTotalSeconds, trackTotalXp } from "@/data/tracks";
import { getTracksPublic } from "@/server/repo/content";
import { getInstructorsPublic } from "@/server/repo/site";
import { formatNumber } from "@/lib/utils";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "課程",
  description:
    "五大資安領域完整課程：Web、Crypto、Reverse、Pwn、Linux & Misc，加上零基礎程式模組。每一課配一題能真的動手打的實戰 Lab。",
};

export default async function LearnPage() {
  const [tracks, instructors] = await Promise.all([getTracksPublic(), getInstructorsPublic()]);
  const lessonCount = tracks.reduce((n, t) => n + trackLessonCount(t), 0);
  const seconds = tracks.reduce((n, t) => n + trackTotalSeconds(t), 0);

  return (
    <main>
      <PageHero
        kicker="LEARNING PATHS"
        title="選一條路，從第一課開始走"
        desc={
          <>
            每個領域都是「入門 → 實戰 → 競賽」三階段。不知道從哪開始的話，
            <Link href="/learn/linux-misc" className="text-accent underline-offset-4 hover:underline">
              Linux 與雜項
            </Link>
            是全員必修，
            <Link href="/learn/web-security" className="text-accent underline-offset-4 hover:underline">
              網頁安全
            </Link>
            則是最多人的第一站。
          </>
        }
        seed={5}
        stats={[
          { value: tracks.length, label: "學習路徑" },
          { value: lessonCount, label: "影音單元" },
          { value: Math.round(seconds / 60), label: "分鐘課程" },
          { value: formatNumber(tracks.reduce((n, t) => n + trackTotalXp(t), 0)), label: "可獲得 XP" },
        ]}
      />

      <div className="mx-auto max-w-7xl px-5 py-14">
        <TrackList tracks={tracks} instructors={instructors} />
      </div>
    </main>
  );
}
