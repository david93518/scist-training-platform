"use client";

import { ProgressBar } from "@/components/ui/primitives";
import { allLessons, type Track } from "@/data/tracks";
import { useProgress, useHydrated, lessonKey } from "@/store/progress";

/** Small "3 / 6 完成" pill with a bar. Client-only because it reads local progress. */
export function TrackProgressPill({ track }: { track: Track }) {
  const completed = useProgress((s) => s.completedLessons);
  const hydrated = useHydrated();
  const lessons = allLessons(track);
  const done = hydrated
    ? lessons.filter((l) => completed.includes(lessonKey(track.slug, l.slug))).length
    : 0;

  return (
    <div className="w-full min-w-[150px] lg:w-[170px]">
      <div className="mb-1.5 flex items-center justify-between">
        <span className="mono-label">你的進度</span>
        <span className="font-mono text-[11.5px] tabular-nums text-fg-2">
          {done}/{lessons.length}
        </span>
      </div>
      <ProgressBar value={lessons.length ? done / lessons.length : 0} color={track.color} />
    </div>
  );
}
