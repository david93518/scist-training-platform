"use client";

import Link from "next/link";
import { useState } from "react";
import {
  ArrowRight,
  Check,
  Flag,
  Flame,
  GraduationCap,
  Lightbulb,
  ListChecks,
  NotebookPen,
  RotateCcw,
  Target,
  TrendingUp,
  Zap,
} from "lucide-react";
import { Icon } from "@/components/ui/icon";
import {
  HexAvatar,
  ProgressBar,
  LinkButton,
  Button,
  DifficultyBadge,
} from "@/components/ui/primitives";
import { allLessons, trackLessonCount, type Track } from "@/data/tracks";
import type { Challenge } from "@/data/challenges";
import { SCHOOLS, schoolById } from "@/data/schools";
import { rankFor, nextRank, rankProgress } from "@/lib/xp";
import { useRanks } from "@/components/settings-provider";
import { useProgress, useHydrated, lessonKey } from "@/store/progress";
import { cn, formatNumber, relativeTime } from "@/lib/utils";

const LOG_ICON = {
  solve: Flag,
  lesson: GraduationCap,
  checkpoint: ListChecks,
  hint: Lightbulb,
  rankup: TrendingUp,
} as const;

export function Dashboard({ tracks, challenges }: { tracks: Track[]; challenges: Challenge[] }) {
  const hydrated = useHydrated();
  const authenticated = useProgress((s) => s.authenticated);
  const xp = useProgress((s) => s.xp);
  const handle = useProgress((s) => s.handle);
  const schoolId = useProgress((s) => s.schoolId);
  const completed = useProgress((s) => s.completedLessons);
  const solved = useProgress((s) => s.solved);
  const checkpoints = useProgress((s) => s.checkpoints);
  const notes = useProgress((s) => s.notes);
  const watched = useProgress((s) => s.watched);
  const log = useProgress((s) => s.log);
  const setProfile = useProgress((s) => s.setProfile);
  const reset = useProgress((s) => s.reset);

  const [editing, setEditing] = useState(false);
  const [draftHandle, setDraftHandle] = useState("");

  const ranks = useRanks();
  const myXp = hydrated ? xp : 0;
  const rank = rankFor(myXp, ranks);
  const nxt = nextRank(myXp, ranks);

  const doneLessons = hydrated ? completed.length : 0;
  const totalLessons = Math.max(1, tracks.reduce((n, t) => n + trackLessonCount(t), 0));
  const solvedFull = hydrated
    ? challenges.filter((c) => (solved[c.slug]?.length ?? 0) === c.flags.length).length
    : 0;
  const checkpointCount = hydrated
    ? Object.values(checkpoints).reduce((n, arr) => n + arr.length, 0)
    : 0;
  const noteKeys = hydrated
    ? Object.entries(notes).filter(([, v]) => v.trim().length > 0)
    : [];

  // next thing to do: first unfinished lesson of the most-advanced track
  const upNext = (() => {
    if (!hydrated) return null;
    for (const t of tracks) {
      for (const l of allLessons(t)) {
        const key = lessonKey(t.slug, l.slug);
        if (!completed.includes(key)) {
          const started = (watched[key] ?? 0) > 0;
          return { track: t, lesson: l, started };
        }
      }
    }
    return null;
  })();

  const recommended = hydrated
    ? challenges.filter((c) => (solved[c.slug]?.length ?? 0) === 0)
        .sort((a, b) => a.points - b.points)
        .slice(0, 3)
    : challenges.slice(0, 3);

  return (
    <div className="flex flex-col gap-6">
      {/* identity */}
      <div className="card border-gradient overflow-hidden">
        <div className="grid gap-6 p-6 sm:grid-cols-[auto_1fr_auto] sm:items-center sm:p-7">
          <HexAvatar seed={hydrated ? handle : "guest"} size={72} />

          <div className="min-w-0">
            {editing && !authenticated ? (
              <div className="flex flex-wrap items-center gap-2">
                <input
                  value={draftHandle}
                  onChange={(e) => setDraftHandle(e.target.value)}
                  placeholder={handle}
                  maxLength={16}
                  className="h-9 rounded-lg border border-line bg-bg-0 px-3 font-mono text-[14px] text-fg outline-none focus:border-accent/50"
                />
                <select
                  defaultValue={schoolId}
                  onChange={(e) => setProfile(draftHandle || handle, e.target.value)}
                  className="h-9 rounded-lg border border-line bg-bg-0 px-2 text-[13px] text-fg-2 outline-none"
                >
                  {SCHOOLS.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.short}
                    </option>
                  ))}
                </select>
                <Button
                  size="sm"
                  onClick={() => {
                    setProfile(draftHandle.trim() || handle, schoolId);
                    setEditing(false);
                  }}
                >
                  儲存
                </Button>
              </div>
            ) : (
              <div className="flex flex-wrap items-center gap-3">
                <h1 className="font-mono text-[26px] font-extrabold tracking-tight">
                  {hydrated ? handle : "guest"}
                </h1>
                <span
                  className="rounded-md border px-2 py-0.5 text-[12px] font-semibold"
                  style={{
                    color: rank.color,
                    borderColor: rank.color + "55",
                    background: rank.color + "14",
                  }}
                >
                  {rank.name}
                </span>
                {authenticated ? null : (
                  <button
                    onClick={() => {
                      setDraftHandle(handle);
                      setEditing(true);
                    }}
                    className="text-[12px] text-fg-3 underline-offset-4 hover:text-fg hover:underline"
                  >
                    編輯
                  </button>
                )}
              </div>
            )}

            <div className="mt-1 text-[13px] text-fg-3">
              {schoolById(hydrated ? schoolId : "tnfsh")?.name} · {rank.blurb}
            </div>

            <div className="mt-4 max-w-md">
              <div className="mb-1.5 flex items-center justify-between text-[11.5px]">
                <span className="font-mono tabular-nums text-fg-2">
                  {formatNumber(myXp)} XP
                </span>
                {nxt ? (
                  <span className="text-fg-3">
                    距離 {nxt.name} 還有 {formatNumber(nxt.minXp - myXp)}
                  </span>
                ) : (
                  <span className="text-fg-3">已達最高階級</span>
                )}
              </div>
              <ProgressBar value={rankProgress(myXp, ranks)} color={rank.color} />
            </div>
          </div>

          <div className="grid grid-cols-4 gap-5 sm:grid-cols-2 sm:gap-6">
            {[
              { v: doneLessons, l: "完成課程", Icon: GraduationCap },
              { v: solvedFull, l: "解出題目", Icon: Flag },
              { v: checkpointCount, l: "通過檢查站", Icon: ListChecks },
              { v: noteKeys.length, l: "課堂筆記", Icon: NotebookPen },
            ].map((s) => (
              <div key={s.l}>
                <s.Icon size={14} className="text-fg-3" />
                <div className="mt-1 font-mono text-[20px] font-bold tabular-nums">
                  {s.v}
                </div>
                <div className="text-[11px] text-fg-3">{s.l}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* up next */}
      {upNext ? (
        <Link
          href={"/learn/" + upNext.track.slug + "/" + upNext.lesson.slug}
          className="card card-hover flex flex-wrap items-center gap-4 p-6"
        >
          <span
            className="clip-hex grid h-12 w-12 shrink-0 place-items-center"
            style={{ background: upNext.track.color + "1f" }}
          >
            <Icon name={upNext.track.icon} size={20} style={{ color: upNext.track.color }} />
          </span>
          <div className="min-w-0 flex-1">
            <div className="mono-label mb-1">
              {upNext.started ? "繼續上次的進度" : "接下來"}
            </div>
            <div className="text-[17px] font-bold">{upNext.lesson.title}</div>
            <div className="mt-1 text-[12.5px] text-fg-3">
              {upNext.track.name} ·{" "}
              {Math.round(upNext.lesson.durationSec / 60)} 分鐘 ·{" "}
              {upNext.lesson.checkpoints.length} 個檢查站
            </div>
          </div>
          <span className="flex shrink-0 items-center gap-2 text-[13px] font-semibold text-accent">
            {upNext.started ? "繼續" : "開始"}
            <ArrowRight size={15} />
          </span>
        </Link>
      ) : (
        <div className="card flex items-center gap-3 p-6">
          <Check size={18} className="text-accent" />
          <span className="text-[15px] font-semibold">
            所有課程都完成了。去題庫找點難的來打。
          </span>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-[1.3fr_1fr]">
        {/* track progress */}
        <div className="card p-6">
          <div className="mb-5 flex items-center gap-2">
            <Target size={15} className="text-fg-3" />
            <span className="text-[14px] font-bold">五大領域進度</span>
          </div>
          <div className="flex flex-col gap-4">
            {tracks.map((t) => {
              const lessons = allLessons(t);
              const done = hydrated
                ? lessons.filter((l) => completed.includes(lessonKey(t.slug, l.slug))).length
                : 0;
              return (
                <Link key={t.id} href={"/learn/" + t.slug} className="group">
                  <div className="mb-1.5 flex items-center gap-2.5">
                    <Icon name={t.icon} size={14} style={{ color: t.color }} />
                    <span className="text-[13.5px] font-semibold transition-colors group-hover:text-accent">
                      {t.name}
                    </span>
                    <span className="ml-auto font-mono text-[11.5px] tabular-nums text-fg-3">
                      {done}/{lessons.length}
                    </span>
                  </div>
                  <ProgressBar value={lessons.length ? done / lessons.length : 0} color={t.color} height={5} />
                </Link>
              );
            })}
          </div>

          <div className="mt-6 border-t border-line pt-5">
            <div className="mb-1.5 flex items-center justify-between">
              <span className="mono-label">整體完成率</span>
              <span className="font-mono text-[12px] text-fg-2">
                {Math.round((doneLessons / totalLessons) * 100)}%
              </span>
            </div>
            <ProgressBar value={doneLessons / totalLessons} height={8} />
          </div>
        </div>

        {/* activity log */}
        <div className="card flex flex-col p-6">
          <div className="mb-4 flex items-center gap-2">
            <Flame size={15} className="text-amber" />
            <span className="text-[14px] font-bold">你的紀錄</span>
          </div>

          {!hydrated || log.length === 0 ? (
            <div className="flex flex-1 flex-col items-center justify-center gap-2 py-10 text-center">
              <Zap size={20} className="text-fg-3" />
              <p className="text-[13px] text-fg-3">
                還沒有紀錄。看一課、或解一題，這裡就會開始長出東西。
              </p>
              <LinkButton href="/challenges/welcome" size="sm" className="mt-2">
                去解第一題
              </LinkButton>
            </div>
          ) : (
            <div className="flex flex-col">
              {log.slice(0, 12).map((e) => {
                const LogIcon = LOG_ICON[e.kind];
                const positive = e.xp >= 0;
                return (
                  <div
                    key={e.id}
                    className="flex items-center gap-3 border-b border-line py-2.5 last:border-b-0"
                  >
                    <LogIcon
                      size={13}
                      className={positive ? "text-accent" : "text-red"}
                    />
                    <span className="min-w-0 flex-1 truncate text-[12.5px] text-fg-2">
                      {e.label}
                    </span>
                    <span className="shrink-0 font-mono text-[10.5px] text-fg-3">
                      {relativeTime(e.at)}
                    </span>
                    <span
                      className={cn(
                        "w-12 shrink-0 text-right font-mono text-[12px] font-bold tabular-nums",
                        positive ? "text-accent" : "text-red",
                      )}
                    >
                      {positive ? "+" : ""}
                      {e.xp}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* recommended challenges */}
      <div>
        <div className="mb-3 flex items-center gap-3">
          <span className="mono-label">建議下一題</span>
          <span className="h-px flex-1 bg-line" />
          <Link
            href="/challenges"
            className="text-[12.5px] text-fg-3 underline-offset-4 hover:text-fg hover:underline"
          >
            看全部
          </Link>
        </div>
        <div className="grid gap-3 sm:grid-cols-3">
          {recommended.map((c) => (
            <Link
              key={c.id}
              href={"/challenges/" + c.slug}
              className="card card-hover flex flex-col gap-2 p-4"
            >
              <div className="flex items-center justify-between">
                <span className="text-[14px] font-bold">{c.name}</span>
                <span className="font-mono text-[11.5px] text-fg-3">{c.points}</span>
              </div>
              <p className="line-clamp-2 text-[12.5px] leading-relaxed text-fg-2">
                {c.blurb}
              </p>
              <DifficultyBadge level={c.difficulty} className="mt-auto pt-1" />
            </Link>
          ))}
        </div>
      </div>

      {/* notes */}
      {noteKeys.length > 0 ? (
        <div className="card p-6">
          <div className="mb-4 flex items-center gap-2">
            <NotebookPen size={15} className="text-fg-3" />
            <span className="text-[14px] font-bold">我的筆記</span>
          </div>
          <div className="flex flex-col gap-3">
            {noteKeys.map(([key, value]) => {
              const [trackSlug, lessonSlug] = key.split("/");
              const track = tracks.find((t) => t.slug === trackSlug);
              const lesson = track
                ? allLessons(track).find((l) => l.slug === lessonSlug)
                : undefined;
              return (
                <Link
                  key={key}
                  href={"/learn/" + key}
                  className="rounded-xl border border-line bg-bg-3/40 p-4 transition-colors hover:border-line-2"
                >
                  <div className="mono-label mb-1.5">{lesson?.title ?? key}</div>
                  <p className="line-clamp-3 whitespace-pre-wrap font-mono text-[12px] leading-relaxed text-fg-2">
                    {value}
                  </p>
                </Link>
              );
            })}
          </div>
        </div>
      ) : null}

      <div className="flex items-center justify-between rounded-xl border border-line bg-bg-1/60 px-5 py-4">
        <p className="text-[12px] leading-relaxed text-fg-3">
          {hydrated && authenticated
            ? "進度已綁定你的帳號，跨裝置同步；XP 與排行榜由伺服器計算。"
            : "進度儲存在這台裝置的瀏覽器。登入後會一併帶到你的帳號，跨裝置同步。"}
        </p>
        {hydrated && authenticated ? null : (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              if (confirm("確定要清除所有進度嗎？這個動作無法復原。")) reset();
            }}
          >
            <RotateCcw size={13} />
            清除進度
          </Button>
        )}
      </div>
    </div>
  );
}
