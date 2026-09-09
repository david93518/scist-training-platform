import { ArrowRight, Flame, Trophy, ShieldCheck } from "lucide-react";
import { SectionHeading, LinkButton, HexAvatar } from "@/components/ui/primitives";
import { PlayerRow } from "@/components/leaderboard/player-row";
import { HexField } from "@/components/ui/hex-field";
import type { Player } from "@/data/players";
import { schoolById } from "@/data/schools";
import { ladder, rankFor, type Rank } from "@/lib/xp";
import { formatNumber } from "@/lib/utils";

const PODIUM = [
  { place: 2, color: "#cfd8e3", size: 64, height: 72 },
  { place: 1, color: "#ffd75e", size: 84, height: 104 },
  { place: 3, color: "#d98a4f", size: 64, height: 56 },
];

export function LeaderboardPreview({ players, ranks }: { players: Player[]; ranks?: Rank[] }) {
  const ladderRanks = ladder(ranks);
  const weekly = [...players].sort((a, b) => b.weeklyXp - a.weeklyXp);
  const top3 = weekly.slice(0, 3);
  const rest = weekly.slice(3, 7);

  return (
    <section className="divider-glow relative overflow-hidden">
      <HexField seed={21} lit={10} color="#ffb84d" className="opacity-60" cx="85%" cy="10%" />
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(800px 400px at 80% 0%, rgba(255,184,77,0.10), transparent 60%)",
        }}
      />
      <div className="relative mx-auto max-w-7xl px-5 py-28">
        <div className="grid gap-14 lg:grid-cols-[0.9fr_1.1fr]">
          <div>
            <SectionHeading
              label="RANKS"
              title={"從" + ladderRanks[0].name + "到" + ladderRanks[ladderRanks.length - 1].name + "，" + ladderRanks.length + " 個階級"}
              desc="XP 來自看課、答對檢查站、解題。用提示會扣分，這是刻意的，我們希望你先自己想。"
            />

            <div className="mt-10 flex flex-col gap-2">
              {ladderRanks.map((r, i) => (
                <div
                  key={r.id}
                  className="reveal flex items-center gap-4 rounded-2xl border border-transparent px-3 py-2.5 transition-colors hover:border-white/[0.07] hover:bg-white/[0.03]"
                  style={{ transitionDelay: i * 60 + "ms" }}
                >
                  <span
                    className="clip-hex grid h-10 w-10 shrink-0 place-items-center"
                    style={{ background: "linear-gradient(145deg, " + r.color + "66, " + r.color + "18)" }}
                  >
                    <span className="clip-hex h-[22px] w-[22px]" style={{ background: r.color }} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-baseline gap-2">
                      <span className="text-[16px] font-extrabold" style={{ color: r.color }}>
                        {r.name}
                      </span>
                      <span className="font-mono text-[10.5px] tracking-wider text-fg-3">
                        {r.en.toUpperCase()}
                      </span>
                    </div>
                    <div className="text-[12.5px] text-fg-3">{r.blurb}</div>
                  </div>
                  <div className="shrink-0 font-mono text-[12.5px] tabular-nums text-fg-2">
                    {formatNumber(r.minXp)} XP
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="card overflow-hidden">
            <div className="flex items-center justify-between border-b border-white/[0.06] px-5 py-4">
              <div className="flex items-center gap-2.5">
                <span className="clip-hex grid h-8 w-8 place-items-center bg-amber/20">
                  <Trophy size={15} className="text-amber" />
                </span>
                <span className="text-[15px] font-extrabold">本週排行榜</span>
              </div>
              <span className="mono-label">每週日重置</span>
            </div>

            {/* podium */}
            <div
              className="relative px-6 pt-8"
              style={{
                background:
                  "radial-gradient(400px 200px at 50% 100%, rgba(255,215,94,0.10), transparent 70%)",
              }}
            >
              <div className="grid grid-cols-3 items-end gap-3">
                {PODIUM.map((p) => {
                  const player = top3[p.place - 1];
                  if (!player) return null;
                  const school = schoolById(player.schoolId);
                  const rank = rankFor(player.xp, ladderRanks);
                  return (
                    <div key={p.place} className="flex flex-col items-center">
                      <div className="relative">
                        <span
                          className="absolute inset-0 clip-hex blur-xl"
                          style={{ background: p.color, opacity: p.place === 1 ? 0.5 : 0.25 }}
                        />
                        <HexAvatar
                          seed={player.handle}
                          hue={player.hue}
                          size={p.size}
                          ring={p.color}
                          className="relative"
                        />
                        <span
                          className="absolute -bottom-2 left-1/2 -translate-x-1/2 rounded-full border-2 border-bg-1 px-2 font-mono text-[10.5px] font-bold text-bg-0"
                          style={{ background: p.color }}
                        >
                          #{p.place}
                        </span>
                      </div>
                      <div className="mt-4 flex items-center gap-1 font-mono text-[14px] font-bold">
                        {player.handle}
                        {player.isAssistant ? (
                          <ShieldCheck size={12} className="text-blue" />
                        ) : null}
                      </div>
                      <div className="text-[11.5px] text-fg-3">
                        {school?.short} · <span style={{ color: rank.color }}>{rank.name}</span>
                      </div>
                      <div className="mt-1 font-mono text-[15px] font-bold tabular-nums text-accent">
                        {formatNumber(player.weeklyXp)}
                      </div>
                      <div
                        className="mt-3 w-full rounded-t-xl border border-b-0 border-white/[0.08]"
                        style={{
                          height: p.height,
                          background:
                            "linear-gradient(180deg, " + p.color + "2a, " + p.color + "08)",
                        }}
                      >
                        <div className="flex items-center justify-center gap-1 pt-2 font-mono text-[10.5px] text-fg-3">
                          <Flame size={10} className="text-amber" />
                          {player.streak} 天
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="border-t border-white/[0.06]">
              {rest.map((p, i) => (
                <PlayerRow key={p.id} player={p} place={i + 4} metric="weekly" ranks={ladderRanks} />
              ))}
            </div>

            <div className="flex items-center justify-between border-t border-white/[0.06] bg-bg-0/40 px-5 py-3.5">
              <span className="text-[13px] text-fg-3">也有以學校為單位的聯防排名</span>
              <LinkButton href="/leaderboard" variant="ghost" size="sm">
                完整排行榜
                <ArrowRight size={14} />
              </LinkButton>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
