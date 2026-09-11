"use client";

import Link from "next/link";
import { Check, Clock, FlaskConical, ListChecks, Play, Zap } from "lucide-react";
import { ProgressBar } from "@/components/ui/primitives";
import type { Lesson, Track } from "@/data/tracks";
import type { Challenge } from "@/data/challenges";
import { useProgress, useHydrated, lessonKey } from "@/store/progress";
import { cn } from "@/lib/utils";

export function LessonRow({
  track,
  lesson,
  index,
  lab,
}: {
  track: Track;
  lesson: Lesson;
  index: number;
  lab?: Challenge;
}) {
  const key = lessonKey(track.slug, lesson.slug);
  const done = useProgress((s) => s.completedLessons.includes(key));
  const watched = useProgress((s) => s.watched[key] ?? 0);
  const answered = useProgress((s) => s.checkpoints[key]?.length ?? 0);
  const authenticated = useProgress((s) => s.authenticated);
  const hydrated = useHydrated();

  // progress belongs to the account: visitors get a plain row
  const showProgress = hydrated && authenticated;
  const isDone = showProgress && done;
  const pos = showProgress ? watched : 0;

  return (
    <Link
      href={"/learn/" + track.slug + "/" + lesson.slug}
      className="group flex gap-4 p-5 transition-colors hover:bg-bg-3/40"
    >
      <span
        className={cn(
          "grid h-9 w-9 shrink-0 place-items-center rounded-xl border font-mono text-[12px] transition-colors",
          isDone
            ? "border-accent bg-accent text-bg-0"
            : "border-line-2 text-fg-3 group-hover:border-accent group-hover:text-accent",
        )}
      >
        {isDone ? <Check size={14} strokeWidth={3} /> : index + 1}
      </span>

      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="text-[15px] font-bold leading-snug">{lesson.title}</h3>
          {lab ? (
            <span className="flex items-center gap-1 rounded border border-teal/40 bg-teal/10 px-1.5 py-px font-mono text-[9.5px] tracking-wider text-teal">
              <FlaskConical size={9} />
              LAB
            </span>
          ) : null}
        </div>

        <p className="mt-1.5 text-[13px] leading-relaxed text-fg-2">{lesson.summary}</p>

        <div className="mt-2.5 flex flex-wrap items-center gap-x-4 gap-y-1 font-mono text-[11px] text-fg-3">
          <span className="flex items-center gap-1">
            <Clock size={11} />
            {Math.round(lesson.durationSec / 60)} 分鐘
          </span>
          <span className="flex items-center gap-1">
            <ListChecks size={11} />
            {showProgress ? answered + "/" + lesson.checkpoints.length : lesson.checkpoints.length} 檢查站
          </span>
          <span className="flex items-center gap-1 text-accent">
            <Zap size={11} />+{lesson.xp} XP
          </span>
        </div>

        {pos > 0 && !isDone ? (
          <div className="mt-2.5 flex items-center gap-2">
            <ProgressBar value={pos} height={3} color={track.color} className="max-w-[220px]" />
            <span className="font-mono text-[10.5px] text-fg-3">
              看到 {Math.round(pos * 100)}%
            </span>
          </div>
        ) : null}
      </div>

      <span className="hidden shrink-0 items-center self-center text-fg-3 transition-colors group-hover:text-accent sm:flex">
        <Play size={16} />
      </span>
    </Link>
  );
}
