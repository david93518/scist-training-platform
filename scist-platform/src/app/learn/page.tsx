import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Clock, ListChecks, Target, Zap } from "lucide-react";
import { Icon } from "@/components/ui/icon";
import { DifficultyBadge, LinkButton } from "@/components/ui/primitives";
import { PageHero } from "@/components/ui/page-hero";
import { TrackProgressPill } from "@/components/learn/track-progress-pill";
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
        {tracks.length === 0 ? <p className="py-20 text-center text-[14px] text-fg-3">還沒有已發布的學習路徑。到後台「學習路徑」建立第一條。</p> : null}
        <div className="flex flex-col gap-5">
          {tracks.map((t, i) => {
            const ins = instructors.find((x) => x.id === t.instructorId);
            const first = t.modules[0]?.lessons[0];
            return (
              <div
                key={t.id}
                className="card card-hover reveal group relative overflow-hidden"
                style={{ transitionDelay: i * 50 + "ms" }}
              >
                <div
                  className="pointer-events-none absolute inset-y-0 left-0 w-[360px] opacity-70"
                  style={{ background: "linear-gradient(90deg, " + t.color + "1c, transparent)" }}
                />
                <Icon
                  name={t.icon}
                  size={220}
                  className="pointer-events-none absolute -bottom-16 -right-10 opacity-[0.06] transition-transform duration-700 group-hover:rotate-6"
                  style={{ color: t.color }}
                />

                <div className="relative grid gap-7 p-7 lg:grid-cols-[auto_1fr_auto] lg:items-center lg:p-8">
                  <span
                    className="clip-hex grid h-[76px] w-[76px] shrink-0 place-items-center"
                    style={{ background: "linear-gradient(145deg, " + t.color + ", " + t.color + "66)" }}
                  >
                    <span className="clip-hex grid h-[68px] w-[68px] place-items-center bg-bg-1">
                      <Icon name={t.icon} size={28} style={{ color: t.color }} />
                    </span>
                  </span>

                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-3">
                      <h2 className="display text-[28px]">{t.name}</h2>
                      <span className="font-mono text-[11.5px] tracking-[0.2em]" style={{ color: t.color }}>
                        {t.en.toUpperCase()}
                      </span>
                      <span className="rounded-md border border-white/[0.08] bg-white/[0.04] px-2 py-0.5 text-[11px] text-fg-2">
                        {t.level}
                      </span>
                    </div>

                    <p className="mt-2.5 text-[15px] leading-relaxed text-fg-2">{t.tagline}</p>

                    <div className="mt-4 flex flex-wrap items-center gap-1.5">
                      {t.syllabus.map((s, k) => (
                        <span key={s} className="flex items-center gap-1.5">
                          <span className="rounded-md border border-white/[0.08] bg-white/[0.03] px-2 py-1 text-[12px] text-fg-2">
                            {s}
                          </span>
                          {k < t.syllabus.length - 1 ? (
                            <ArrowRight size={11} className="text-fg-3" />
                          ) : null}
                        </span>
                      ))}
                    </div>

                    <div className="mt-5 flex flex-wrap items-center gap-x-5 gap-y-2 font-mono text-[12px] text-fg-3">
                      <DifficultyBadge level={t.difficulty} />
                      <span className="flex items-center gap-1.5">
                        <ListChecks size={12} />
                        {trackLessonCount(t)} 課
                      </span>
                      <span className="flex items-center gap-1.5">
                        <Clock size={12} />
                        {Math.round(trackTotalSeconds(t) / 60)} 分鐘
                      </span>
                      <span className="flex items-center gap-1.5 text-accent">
                        <Zap size={12} />+{formatNumber(trackTotalXp(t))} XP
                      </span>
                      <span className="flex items-center gap-1.5">
                        <Target size={12} />
                        {t.outcome}
                      </span>
                    </div>
                  </div>

                  <div className="flex shrink-0 flex-col items-start gap-3 lg:w-[190px] lg:items-stretch">
                    <TrackProgressPill track={t} />
                    {ins ? (
                      <div className="text-[12.5px] text-fg-3">
                        講師 <span className="font-mono text-fg-2">@{ins.handle}</span>
                      </div>
                    ) : null}
                    <LinkButton
                      href={first ? "/learn/" + t.slug + "/" + first.slug : "/learn/" + t.slug}
                      size="sm"
                    >
                      開始上課
                      <ArrowRight size={14} />
                    </LinkButton>
                    <Link
                      href={"/learn/" + t.slug}
                      className="text-[12.5px] text-fg-3 underline-offset-4 hover:text-fg hover:underline"
                    >
                      看完整大綱
                    </Link>
                  </div>
                </div>

                <div
                  className="absolute inset-x-0 bottom-0 h-[3px] origin-left scale-x-0 transition-transform duration-500 group-hover:scale-x-100"
                  style={{ background: "linear-gradient(90deg, " + t.color + ", transparent)" }}
                />
              </div>
            );
          })}
        </div>
      </div>
    </main>
  );
}
