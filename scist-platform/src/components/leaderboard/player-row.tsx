import { Flame, ShieldCheck } from "lucide-react";
import { HexAvatar } from "@/components/ui/primitives";
import { schoolById } from "@/data/schools";
import type { Player } from "@/data/players";
import { rankFor } from "@/lib/xp";
import { cn, formatNumber } from "@/lib/utils";

const PODIUM = ["#ffd75e", "#cfd8e3", "#d98a4f"];

export function RankNumber({ place }: { place: number }) {
  const podium = place <= 3;
  return (
    <span
      className={cn(
        "grid w-8 shrink-0 place-items-center font-mono text-[13px] font-bold tabular-nums",
        !podium && "text-fg-3",
      )}
      style={podium ? { color: PODIUM[place - 1] } : undefined}
    >
      {place}
    </span>
  );
}

export function PlayerRow({
  player,
  place,
  metric = "xp",
  highlight,
}: {
  player: Player;
  place: number;
  metric?: "xp" | "weekly";
  highlight?: boolean;
}) {
  const school = schoolById(player.schoolId);
  const rank = rankFor(player.xp);
  const value = metric === "xp" ? player.xp : player.weeklyXp;

  return (
    <div
      className={cn(
        "flex items-center gap-3 border-b border-line px-3 py-3 transition-colors last:border-b-0 hover:bg-bg-3/50",
        highlight && "bg-accent/[0.05]",
      )}
    >
      <RankNumber place={place} />
      <HexAvatar seed={player.handle} hue={player.hue} size={34} />

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          <span className="truncate font-mono text-[13.5px] font-bold">
            {player.handle}
          </span>
          {player.isAssistant ? (
            <ShieldCheck size={12} className="shrink-0 text-blue" aria-label="助教" />
          ) : null}
        </div>
        <div className="flex items-center gap-2 text-[11.5px] text-fg-3">
          <span>{school?.short ?? "—"}</span>
          <span className="h-2.5 w-px bg-line-2" />
          <span style={{ color: rank.color }}>{rank.name}</span>
        </div>
      </div>

      <div className="hidden items-center gap-1 font-mono text-[11.5px] text-fg-3 sm:flex">
        <Flame size={11} className="text-amber" />
        {player.streak}
      </div>

      <div className="hidden w-14 text-right font-mono text-[12px] text-fg-3 sm:block">
        {player.solves} 解
      </div>

      <div className="w-20 text-right font-mono text-[14px] font-bold tabular-nums text-accent">
        {formatNumber(value)}
      </div>
    </div>
  );
}
