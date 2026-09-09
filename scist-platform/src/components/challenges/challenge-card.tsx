"use client";

import Link from "next/link";
import { Check, Droplet, Server, Star, Users } from "lucide-react";
import { Icon } from "@/components/ui/icon";
import { DifficultyBadge } from "@/components/ui/primitives";
import { CATEGORY_META, type Challenge } from "@/data/challenges";
import { useProgress, useHydrated } from "@/store/progress";
import { cn, formatNumber } from "@/lib/utils";

export function ChallengeCard({
  challenge,
  delay = 0,
}: {
  challenge: Challenge;
  delay?: number;
}) {
  const solvedIds = useProgress((s) => s.solved[challenge.slug]);
  const hydrated = useHydrated();
  const meta = CATEGORY_META[challenge.category];

  const done = hydrated ? (solvedIds?.length ?? 0) : 0;
  const total = challenge.flags.length;
  const fullySolved = done === total && total > 0;

  return (
    <Link
      href={"/challenges/" + challenge.slug}
      className={cn(
        "card card-hover reveal group relative flex flex-col overflow-hidden p-5 pl-6",
        fullySolved && "border-accent/40",
      )}
      style={{ transitionDelay: delay + "ms" }}
    >
      {/* category accent */}
      <span
        className="absolute inset-y-4 left-0 w-[3px] rounded-r-full"
        style={{ background: meta.color, boxShadow: "0 0 14px " + meta.color }}
      />
      <span
        className="pointer-events-none absolute -right-20 -top-20 h-48 w-48 rounded-full opacity-0 blur-3xl transition-opacity duration-500 group-hover:opacity-100"
        style={{ background: meta.color + "33" }}
      />

      {fullySolved ? (
        <span className="absolute right-0 top-0 flex items-center gap-1 rounded-bl-xl bg-accent px-2.5 py-1 font-mono text-[10px] font-bold text-bg-0 shadow-[0_0_20px_rgba(164,241,59,0.6)]">
          <Check size={11} strokeWidth={3} />
          SOLVED
        </span>
      ) : null}

      <div className="flex items-start gap-3.5">
        <span
          className="clip-hex grid h-12 w-12 shrink-0 place-items-center"
          style={{ background: "linear-gradient(145deg, " + meta.color + "55, " + meta.color + "15)" }}
        >
          <Icon name={meta.icon} size={20} style={{ color: meta.color }} />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h3 className="truncate text-[17px] font-extrabold tracking-tight">
              {challenge.name}
            </h3>
            {challenge.kind === "box" ? (
              <span className="flex shrink-0 items-center gap-1 rounded border border-purple/40 bg-purple/10 px-1.5 py-px font-mono text-[9.5px] tracking-wider text-purple">
                <Server size={9} />
                BOX
              </span>
            ) : null}
          </div>
          <div className="mt-0.5 font-mono text-[10.5px] tracking-[0.18em]" style={{ color: meta.color }}>
            {meta.en.toUpperCase()}
          </div>
        </div>
      </div>

      <p className="mt-4 line-clamp-2 min-h-[44px] text-[13.5px] leading-relaxed text-fg-2">
        {challenge.blurb}
      </p>

      {total > 1 ? (
        <div className="mt-3 flex gap-1.5">
          {challenge.flags.map((f) => {
            const got = hydrated && (solvedIds ?? []).includes(f.id);
            return (
              <span
                key={f.id}
                className={cn(
                  "flex items-center gap-1 rounded-md border px-1.5 py-0.5 font-mono text-[9.5px] tracking-wider",
                  got
                    ? "border-accent/50 bg-accent/10 text-accent"
                    : "border-white/[0.08] bg-white/[0.03] text-fg-3",
                )}
              >
                {got ? <Check size={9} strokeWidth={3} /> : null}
                {f.label.toUpperCase()}
              </span>
            );
          })}
        </div>
      ) : null}

      <div className="mt-auto flex items-center justify-between border-t border-white/[0.06] pt-4 [margin-top:16px]">
        <DifficultyBadge level={challenge.difficulty} />
        <div className="flex items-center gap-3 font-mono text-[11.5px] text-fg-3">
          <span className="flex items-center gap-1">
            <Users size={11} />
            {formatNumber(challenge.solves)}
          </span>
          <span className="flex items-center gap-1">
            <Star size={11} className="text-amber" />
            {challenge.rating.toFixed(1)}
          </span>
          <span className="rounded-md bg-white/[0.06] px-2 py-0.5 font-bold text-fg">
            {challenge.points}
          </span>
        </div>
      </div>

      {challenge.firstBlood ? (
        <div className="mt-2.5 flex items-center gap-1.5 font-mono text-[10.5px] text-fg-3">
          <Droplet size={10} className="text-red" />
          First Blood
          <span className="text-fg-2">{challenge.firstBlood.handle}</span>
          <span>· {challenge.firstBlood.school}</span>
        </div>
      ) : null}
    </Link>
  );
}
