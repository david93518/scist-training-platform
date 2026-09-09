"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { ArrowRight, Clock, ListChecks, Search, Target, X, Zap } from "lucide-react";
import { Icon } from "@/components/ui/icon";
import { DifficultyBadge, LinkButton } from "@/components/ui/primitives";
import { TrackProgressPill } from "@/components/learn/track-progress-pill";
import { allLessons, trackLessonCount, trackTotalSeconds, trackTotalXp, type Track } from "@/data/tracks";
import type { Instructor } from "@/data/instructors";
import { formatNumber } from "@/lib/utils";

/**
 * Searches the path name, tagline, syllabus keywords, outcome and every
 * lesson title, so "XSS" finds Web Security even though the word only
 * appears inside one lesson.
 */
function haystack(track: Track) {
  return [
    track.name,
    track.en,
    track.tagline,
    track.outcome,
    track.level,
    ...track.syllabus,
    ...allLessons(track).map((l) => l.title + " " + l.summary),
  ]
    .join(" ")
    .toLowerCase();
}

export function TrackList({ tracks, instructors }: { tracks: Track[]; instructors: Instructor[] }) {
  const [q, setQ] = useState("");

  const index = useMemo(() => new Map(tracks.map((t) => [t.id, haystack(t)])), [tracks]);
  const visible = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return tracks;
    return tracks.filter((t) => index.get(t.id)?.includes(needle));
  }, [tracks, index, q]);

  return (
    <div>
      <div className="mb-6 flex h-11 items-center gap-2.5 rounded-xl border border-line bg-bg-2 px-4 focus-within:border-accent/50">
        <Search size={15} className="shrink-0 text-fg-3" />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="搜尋路徑或課程，例如 XSS、RSA、緩衝區溢位"
          className="w-full bg-transparent text-[13.5px] text-fg outline-none placeholder:text-fg-3"
        />
        {q ? (
          <button onClick={() => setQ("")} className="shrink-0 text-fg-3 hover:text-fg" aria-label="清除搜尋">
            <X size={15} />
          </button>
        ) : null}
        <span className="shrink-0 font-mono text-[11.5px] text-fg-3">{visible.length} 條</span>
      </div>

      {tracks.length === 0 ? (
        <p className="py-20 text-center text-[14px] text-fg-3">還沒有已發布的學習路徑。到後台「學習路徑」建立第一條。</p>
      ) : null}
      {tracks.length > 0 && visible.length === 0 ? (
        <p className="py-20 text-center text-[14px] text-fg-3">沒有符合「{q}」的路徑。換個關鍵字，或直接去題庫找題目。</p>
      ) : null}

      <div className="flex flex-col gap-5">
        {visible.map((t, i) => {
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
  );
}
