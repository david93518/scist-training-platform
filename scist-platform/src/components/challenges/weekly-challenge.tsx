import Link from "next/link";
import { ArrowRight, CalendarClock, Medal, Trophy } from "lucide-react";
import { Icon } from "@/components/ui/icon";
import { DifficultyBadge, HexAvatar } from "@/components/ui/primitives";
import { CATEGORY_META, type Category } from "@/data/challenges";
import type { WeeklyChallenge as Weekly } from "@/server/repo/site";
import type { Difficulty } from "@/lib/xp";
import { formatNumber } from "@/lib/utils";

const MEDAL = ["#ffd35c", "#cfd8e3", "#d99a63"];

/** 台北時間的 M/D，讓截止日跟公告的日期一致。 */
function taipeiDate(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString("zh-TW", { timeZone: "Asia/Taipei", month: "numeric", day: "numeric" });
}

/**
 * 本週指定挑戰。後台設定 slug 才會出現，所以開學前空著也不會露出半個空框。
 */
export function WeeklyChallengeBanner({ weekly }: { weekly: Weekly }) {
  const meta = CATEGORY_META[weekly.category as Category];
  // 週結束的那一刻等於下週開始，寫成截止日要退一天才不會多算
  const deadline = taipeiDate(new Date(new Date(weekly.until).getTime() - 86400_000).toISOString());

  return (
    <div className="card border-gradient overflow-hidden">
      <div className="grid gap-6 p-6 lg:grid-cols-[1fr_auto] lg:items-center">
        <div className="min-w-0">
          <div className="mb-3 flex flex-wrap items-center gap-2.5">
            <span className="flex items-center gap-1.5 rounded-md border border-amber/40 bg-amber/10 px-2 py-0.5 text-[11.5px] font-bold text-amber">
              <Trophy size={12} />
              本週挑戰
            </span>
            <span className="flex items-center gap-1.5 font-mono text-[11.5px] text-fg-3">
              <CalendarClock size={12} />
              {taipeiDate(weekly.from)} – {deadline}
            </span>
            {weekly.bonusXp > 0 ? (
              <span className="font-mono text-[11.5px] font-bold text-accent">前三名 +{formatNumber(weekly.bonusXp)} XP</span>
            ) : null}
          </div>

          <Link href={"/challenges/" + weekly.slug} className="group flex flex-wrap items-center gap-3">
            {meta ? (
              <span className="clip-hex grid h-10 w-10 shrink-0 place-items-center" style={{ background: meta.color + "1f" }}>
                <Icon name={meta.icon} size={17} style={{ color: meta.color }} />
              </span>
            ) : null}
            <h3 className="text-[22px] font-extrabold tracking-tight transition-colors group-hover:text-accent">{weekly.name}</h3>
            <DifficultyBadge level={weekly.difficulty as Difficulty} />
            <span className="font-mono text-[12.5px] text-fg-3">{formatNumber(weekly.points)} 分</span>
          </Link>

          {weekly.note ? <p className="mt-3 max-w-2xl text-[13px] leading-relaxed text-fg-2">{weekly.note}</p> : null}

          <Link
            href={"/challenges/" + weekly.slug}
            className="group mt-4 inline-flex items-center gap-2 font-mono text-[13px] font-bold text-accent"
          >
            去解這題
            <ArrowRight size={14} className="transition-transform group-hover:translate-x-1" />
          </Link>
        </div>

        <div className="lg:w-64 lg:border-l lg:border-line lg:pl-6">
          <div className="mono-label mb-3">本週最快解出</div>
          {weekly.top.length === 0 ? (
            <p className="text-[12.5px] leading-relaxed text-fg-3">這一週還沒有人解出來。第一個解出的人會掛在這裡。</p>
          ) : (
            <div className="flex flex-col gap-2.5">
              {weekly.top.map((p) => (
                <div key={p.handle} className="flex items-center gap-2.5">
                  <Medal size={14} className="shrink-0" style={{ color: MEDAL[p.rank - 1] }} />
                  <HexAvatar seed={p.handle} size={24} />
                  <div className="min-w-0 flex-1">
                    <div className="truncate font-mono text-[12.5px] font-bold">{p.handle}</div>
                    {p.schoolShort ? <div className="text-[10.5px] text-fg-3">{p.schoolShort}</div> : null}
                  </div>
                </div>
              ))}
              {weekly.solversThisWeek > weekly.top.length ? (
                <div className="font-mono text-[11px] text-fg-3">本週共 {weekly.solversThisWeek} 人解出</div>
              ) : null}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
