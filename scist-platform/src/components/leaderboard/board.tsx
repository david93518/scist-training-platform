"use client";

import { useState } from "react";
import { Trophy, Flame, School, Zap } from "lucide-react";
import { PlayerRow, RankNumber } from "@/components/leaderboard/player-row";
import { HexAvatar, ProgressBar } from "@/components/ui/primitives";
import type { Player, SchoolStanding } from "@/data/players";
import { schoolById } from "@/data/schools";
import { rankFor, nextRank, rankProgress, RANKS } from "@/lib/xp";
import { useProgress, useHydrated } from "@/store/progress";
import { cn, formatNumber } from "@/lib/utils";

type Tab = "weekly" | "alltime" | "schools";

const TABS: { id: Tab; label: string; Icon: typeof Trophy }[] = [
  { id: "weekly", label: "本週", Icon: Flame },
  { id: "alltime", label: "總排行", Icon: Trophy },
  { id: "schools", label: "學校聯防", Icon: School },
];

export function Board({ players, schools, resetDay = "週日" }: { players: Player[]; schools: SchoolStanding[]; resetDay?: string }) {
  const [tab, setTab] = useState<Tab>("weekly");
  const xp = useProgress((s) => s.xp);
  const handle = useProgress((s) => s.handle);
  const schoolId = useProgress((s) => s.schoolId);
  const userId = useProgress((s) => s.userId);
  const authenticated = useProgress((s) => s.authenticated);
  const hydrated = useHydrated();

  const myXp = hydrated ? xp : 0;
  const rank = rankFor(myXp);
  const nxt = nextRank(myXp);
  const progress = rankProgress(myXp);
  // where the reader sits on the all-time board
  const myPlace = players.filter((p) => p.xp > myXp).length + 1;

  const list = tab === "weekly" ? [...players].sort((a, b) => b.weeklyXp - a.weeklyXp) : [...players].sort((a, b) => b.xp - a.xp);
  const topSchoolXp = schools[0]?.xp ?? 1;

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
      <div>
        <div className="flex rounded-xl border border-line bg-bg-2 p-1">
          {TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={cn(
                "flex flex-1 items-center justify-center gap-2 rounded-lg px-3 py-2.5 text-[13px] font-semibold transition-colors",
                tab === t.id ? "bg-bg-4 text-fg" : "text-fg-3 hover:text-fg-2",
              )}
            >
              <t.Icon size={14} />
              {t.label}
            </button>
          ))}
        </div>

        {tab === "schools" ? (
          <div className="card mt-4 overflow-hidden">
            <div className="flex items-center justify-between border-b border-line bg-bg-3/40 px-4 py-3">
              <span className="text-[13.5px] font-bold">18 校聯防積分</span>
              <span className="mono-label">依成員總 XP</span>
            </div>
            {schools.length === 0 ? <p className="p-6 text-center text-[13px] text-fg-3">還沒有學校上榜。</p> : null}
            {schools.map((s, i) => {
              const school = schoolById(s.schoolId);
              return (
                <div
                  key={s.schoolId}
                  className={cn("flex items-center gap-3 border-b border-line px-3 py-3.5 last:border-b-0", hydrated && authenticated && s.schoolId === schoolId && "bg-accent/[0.05]")}
                >
                  <RankNumber place={i + 1} />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-baseline gap-2">
                      <span className="truncate text-[14px] font-bold">
                        {school?.short ?? s.schoolId}
                      </span>
                      <span className="truncate text-[11.5px] text-fg-3">
                        {school?.name}
                      </span>
                    </div>
                    <ProgressBar
                      value={s.xp / topSchoolXp}
                      height={4}
                      className="mt-2 max-w-md"
                    />
                  </div>
                  <div className="hidden text-right sm:block">
                    <div className="font-mono text-[12px] text-fg-3">
                      {s.members} 人
                    </div>
                    <div className="font-mono text-[11px] text-fg-3">
                      {s.solves} 解
                    </div>
                  </div>
                  <div className="w-24 text-right font-mono text-[14px] font-bold tabular-nums text-accent">
                    {formatNumber(s.xp)}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="card mt-4 overflow-hidden">
            <div className="flex items-center justify-between border-b border-line bg-bg-3/40 px-4 py-3">
              <span className="text-[13.5px] font-bold">
                {tab === "weekly" ? "本週排行榜" : "歷史總排行"}
              </span>
              <span className="mono-label">
                {tab === "weekly" ? "每" + resetDay + " 00:00 重置" : "累計至今"}
              </span>
            </div>
            {list.length === 0 ? <p className="p-6 text-center text-[13px] text-fg-3">還沒有人上榜。解出第一題就是第一名。</p> : null}
            {list.map((p, i) => (
              <PlayerRow
                key={p.id}
                player={p}
                place={i + 1}
                metric={tab === "weekly" ? "weekly" : "xp"}
                highlight={hydrated && authenticated && p.id === userId}
              />
            ))}
          </div>
        )}
      </div>

      <aside className="flex flex-col gap-4">
        <div className="card border-accent/25 p-5">
          <div className="mono-label mb-3">你的位置</div>
          <div className="flex items-center gap-3">
            <HexAvatar seed={hydrated ? handle : "guest"} size={46} />
            <div className="min-w-0">
              <div className="font-mono text-[15px] font-bold">
                {hydrated ? handle : "guest"}
              </div>
              <div className="text-[12px] text-fg-3">
                {schoolById(hydrated ? schoolId : "tnfsh")?.short} ·{" "}
                <span style={{ color: rank.color }}>{rank.name}</span>
              </div>
            </div>
            <div className="ml-auto text-right">
              <div className="font-mono text-[20px] font-bold tabular-nums text-accent">
                {formatNumber(myXp)}
              </div>
              <div className="text-[11px] text-fg-3">XP</div>
            </div>
          </div>

          <div className="mt-4">
            <div className="mb-1.5 flex items-center justify-between text-[11.5px]">
              <span style={{ color: rank.color }}>{rank.name}</span>
              {nxt ? (
                <span className="text-fg-3">
                  還差 {formatNumber(nxt.minXp - myXp)} XP 到 {nxt.name}
                </span>
              ) : (
                <span className="text-fg-3">已達最高階級</span>
              )}
            </div>
            <ProgressBar value={progress} color={rank.color} />
          </div>

          <div className="mt-4 flex items-center gap-2 border-t border-line pt-3.5">
            <Zap size={13} className="text-accent" />
            <span className="text-[12.5px] text-fg-2">
              {hydrated && authenticated ? (
                <>
                  你在總榜第 <span className="font-mono font-bold text-fg">{myPlace}</span> 名
                </>
              ) : (
                <>
                  登入後以目前分數會在總榜第 <span className="font-mono font-bold text-fg">{myPlace}</span> 名
                </>
              )}
            </span>
          </div>
        </div>

        <div className="card p-5">
          <div className="mono-label mb-3">階級門檻</div>
          <div className="flex flex-col gap-2.5">
            {RANKS.map((r) => {
              const reached = myXp >= r.minXp;
              return (
                <div key={r.id} className="flex items-center gap-3">
                  <span
                    className="clip-hex h-7 w-7 shrink-0"
                    style={{
                      background: reached ? r.color + "33" : "var(--color-bg-4)",
                    }}
                  />
                  <span
                    className={cn(
                      "flex-1 text-[13px] font-semibold",
                      reached ? "" : "text-fg-3",
                    )}
                    style={reached ? { color: r.color } : undefined}
                  >
                    {r.name}
                  </span>
                  <span className="font-mono text-[11.5px] tabular-nums text-fg-3">
                    {formatNumber(r.minXp)}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        <div className="card p-5">
          <div className="mono-label mb-2">怎麼拿 XP</div>
          <ul className="flex flex-col gap-2 text-[12.5px] text-fg-2">
            <li className="flex justify-between">
              <span>答對知識點檢查站</span>
              <span className="font-mono text-accent">+20 ~ 30</span>
            </li>
            <li className="flex justify-between">
              <span>完成一課</span>
              <span className="font-mono text-accent">+60 ~ 130</span>
            </li>
            <li className="flex justify-between">
              <span>解出題目</span>
              <span className="font-mono text-accent">+50 ~ 900</span>
            </li>
            <li className="flex justify-between">
              <span>解鎖提示</span>
              <span className="font-mono text-red">-10 ~ 100</span>
            </li>
          </ul>
          <p className="mt-3 border-t border-line pt-3 text-[11.5px] leading-relaxed text-fg-3">
            共 {players.length} 位學員在榜上。{hydrated && authenticated ? "你的分數已綁定帳號，跨裝置同步。" : "登入後你的分數才會出現在榜上。"}
          </p>
        </div>
      </aside>
    </div>
  );
}
