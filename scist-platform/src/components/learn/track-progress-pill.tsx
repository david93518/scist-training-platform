"use client";

import { ProgressBar } from "@/components/ui/primitives";
import { allLessons, type Track } from "@/data/tracks";
import { useProgress, useHydrated, lessonKey } from "@/store/progress";
import { cn } from "@/lib/utils";

/**
 * Small "3 / 6 完成" pill with a bar for the signed-in learner. Renders
 * nothing for visitors (and before hydration), so a visitor never sees a
 * "你的進度 0/N" they cannot act on. The caller controls the width.
 */
export function TrackProgressPill({ track, className }: { track: Track; className?: string }) {
  const completed = useProgress((s) => s.completedLessons);
  const authenticated = useProgress((s) => s.authenticated);
  const hydrated = useHydrated();
  if (!hydrated || !authenticated) return null;

  const lessons = allLessons(track);
  const done = lessons.filter((l) => completed.includes(lessonKey(track.slug, l.slug))).length;

  return (
    <div className={cn("w-full min-w-[150px]", className)}>
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
