"use client";

import Link from "next/link";
import { Check, Play, Lock, ArrowLeft } from "lucide-react";
import { ProgressBar } from "@/components/ui/primitives";
import { allLessons, type Track } from "@/data/tracks";
import { useProgress, useHydrated, lessonKey } from "@/store/progress";
import { cn } from "@/lib/utils";

export function CurriculumSidebar({
  track,
  currentSlug,
}: {
  track: Track;
  currentSlug: string;
}) {
  const completed = useProgress((s) => s.completedLessons);
  const watched = useProgress((s) => s.watched);
  const authenticated = useProgress((s) => s.authenticated);
  const hydrated = useHydrated();
  const lessons = allLessons(track);

  // progress belongs to the account: without one the outline is plain
  const showProgress = hydrated && authenticated;
  const doneCount = showProgress
    ? lessons.filter((l) => completed.includes(lessonKey(track.slug, l.slug))).length
    : 0;

  return (
    <aside className="flex flex-col gap-4">
      <Link
        href={"/learn/" + track.slug}
        className="flex items-center gap-2 text-[12.5px] text-fg-3 transition-colors hover:text-fg"
      >
        <ArrowLeft size={14} />
        回到 {track.name}
      </Link>

      <div className="card overflow-hidden">
        <div className="border-b border-line px-4 py-3.5">
          <div
            className="font-mono text-[10.5px] tracking-[0.18em]"
            style={{ color: track.color }}
          >
            {track.en.toUpperCase()}
          </div>
          <div className="mt-0.5 text-[15px] font-bold">{track.name}</div>
        </div>

        <div className="max-h-[520px] overflow-y-auto">
          {track.modules.map((mod) => (
            <div key={mod.title}>
              <div className="sticky top-0 z-10 bg-bg-1/95 px-4 py-2 backdrop-blur">
                <span className="mono-label">{mod.title}</span>
              </div>
              {mod.lessons.map((l, i) => {
                const key = lessonKey(track.slug, l.slug);
                const isDone = showProgress && completed.includes(key);
                const isCurrent = l.slug === currentSlug;
                const pos = showProgress ? (watched[key] ?? 0) : 0;
                return (
                  <Link
                    key={l.id}
                    href={"/learn/" + track.slug + "/" + l.slug}
                    className={cn(
                      "flex gap-3 border-l-2 px-4 py-3 transition-colors",
                      isCurrent
                        ? "border-l-accent bg-accent/[0.06]"
                        : "border-l-transparent hover:bg-bg-3/50",
                    )}
                  >
                    <span
                      className={cn(
                        "mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full border font-mono text-[10px]",
                        isDone
                          ? "border-accent bg-accent text-bg-0"
                          : isCurrent
                            ? "border-accent text-accent"
                            : "border-line-2 text-fg-3",
                      )}
                    >
                      {isDone ? (
                        <Check size={11} strokeWidth={3} />
                      ) : isCurrent ? (
                        <Play size={9} fill="currentColor" />
                      ) : (
                        i + 1
                      )}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span
                        className={cn(
                          "block text-[13px] font-semibold leading-snug",
                          isCurrent ? "text-fg" : isDone ? "text-fg-2" : "text-fg-2",
                        )}
                      >
                        {l.title}
                      </span>
                      <span className="mt-1 flex items-center gap-2 font-mono text-[10.5px] text-fg-3">
                        <span>{Math.round(l.durationSec / 60)} 分鐘</span>
                        <span>·</span>
                        <span>{l.checkpoints.length} 檢查站</span>
                        {l.labSlug ? (
                          <>
                            <span>·</span>
                            <span className="text-teal">Lab</span>
                          </>
                        ) : null}
                      </span>
                      {pos > 0 && !isDone ? (
                        <ProgressBar
                          value={pos}
                          height={2}
                          color={track.color}
                          className="mt-1.5"
                        />
                      ) : null}
                    </span>
                  </Link>
                );
              })}
            </div>
          ))}
        </div>

        {showProgress ? (
          <div className="border-t border-line bg-bg-1/60 px-4 py-3">
            <div className="mb-2 flex items-center justify-between">
              <span className="mono-label">你的進度</span>
              <span className="font-mono text-[11.5px] text-fg-2">
                {doneCount} / {lessons.length}
              </span>
            </div>
            <ProgressBar value={lessons.length ? doneCount / lessons.length : 0} color={track.color} />
          </div>
        ) : null}
      </div>

      <div className="card flex items-start gap-3 p-4">
        <Lock size={15} className="mt-0.5 shrink-0 text-fg-3" />
        <p className="text-[12px] leading-relaxed text-fg-3">
          完成本課全部檢查站，才能解鎖下一課。這是刻意的：我們希望你是真的懂了才往前。
        </p>
      </div>
    </aside>
  );
}
