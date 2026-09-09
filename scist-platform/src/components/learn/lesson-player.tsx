"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Clock,
  FlaskConical,
  ListChecks,
  MessageSquare,
  NotebookPen,
  RotateCcw,
  Zap,
  Flag,
  Lock,
} from "lucide-react";
import { VideoStage, NO_VIDEO, type LessonVideo } from "@/components/learn/video-stage";
import {
  CheckpointQuiz,
  LockedCheckpoint,
  AllCheckpointsDone,
} from "@/components/learn/checkpoint-quiz";
import { ContentBlocks } from "@/components/learn/content-blocks";
import { QaPanel } from "@/components/community/qa-panel";
import { Button, LinkButton, ProgressBar, DifficultyBadge } from "@/components/ui/primitives";
import type { Challenge } from "@/data/challenges";
import { lessonNeighbours, type Lesson, type Track } from "@/data/tracks";
import { useProgress, useHydrated, lessonKey } from "@/store/progress";
import { useCanRecordProgress } from "@/components/settings-provider";
import { cn, formatMinutes } from "@/lib/utils";

type TabId = "quiz" | "lab" | "notes" | "qa";

const TICK_MS = 250;

export function LessonPlayer({ track, lesson, lab, video = NO_VIDEO }: { track: Track; lesson: Lesson; lab?: Challenge; video?: LessonVideo }) {
  const key = lessonKey(track.slug, lesson.slug);
  const hydrated = useHydrated();
  // a real recording drives the clock; the stand-in ticks on its own
  const real = video.provider !== "none" && Boolean(video.provider === "stream" ? video.url : video.videoId);

  const watched = useProgress((s) => s.watched[key] ?? 0);
  const answered = useProgress((s) => s.checkpoints[key]);
  const note = useProgress((s) => s.notes[key] ?? "");
  const isDone = useProgress((s) => s.completedLessons.includes(key));
  const authenticated = useProgress((s) => s.authenticated);
  const setWatched = useProgress((s) => s.setWatched);
  const answerCheckpoint = useProgress((s) => s.answerCheckpoint);
  const setNote = useProgress((s) => s.setNote);
  const completeLesson = useProgress((s) => s.completeLesson);
  const canRecord = useCanRecordProgress();

  const answeredSet = useMemo(() => new Set(answered ?? []), [answered]);

  const [position, setPosition] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState(1);
  const [captions, setCaptions] = useState(!real);
  const [tab, setTab] = useState<TabId>("quiz");
  const [gateIndex, setGateIndex] = useState<number | null>(null);
  const [justCompleted, setJustCompleted] = useState(false);

  // The page remounts this component per lesson (via key), so there is no
  // cross-lesson state to clear here.
  const canResume =
    hydrated && watched > 0.02 && watched < 0.999 && position < 0.01;

  const nextGate = useCallback(
    (p: number) => {
      for (let i = 0; i < lesson.checkpoints.length; i++) {
        const c = lesson.checkpoints[i];
        if (!answeredSet.has(i) && p >= c.at) return i;
      }
      return null;
    },
    [lesson.checkpoints, answeredSet],
  );

  // stand-in playback loop
  useEffect(() => {
    if (!playing || real) return;
    const id = setInterval(() => {
      setPosition((p) => {
        const step = (TICK_MS / 1000 / lesson.durationSec) * speed * 18;
        const next = Math.min(1, p + step);
        const gate = nextGate(next);
        if (gate !== null) {
          setPlaying(false);
          setGateIndex(gate);
          setTab("quiz");
          return lesson.checkpoints[gate].at;
        }
        if (next >= 1) setPlaying(false);
        return next;
      });
    }, TICK_MS);
    return () => clearInterval(id);
  }, [playing, real, speed, lesson.durationSec, lesson.checkpoints, nextGate]);

  // real player clock → the same gate logic
  const onProgress = useCallback(
    (p: number) => {
      const gate = nextGate(p);
      if (gate !== null) {
        setPlaying(false);
        setGateIndex(gate);
        setTab("quiz");
        setPosition(lesson.checkpoints[gate].at);
        return;
      }
      setPosition(p);
      if (p >= 0.999) setPlaying(false);
    },
    [nextGate, lesson.checkpoints],
  );

  // persist watch position
  useEffect(() => {
    if (!hydrated || position <= 0) return;
    const id = setTimeout(() => setWatched(key, position), 400);
    return () => clearTimeout(id);
  }, [position, key, hydrated, setWatched]);

  const allChecked =
    lesson.checkpoints.length > 0 &&
    lesson.checkpoints.every((_, i) => answeredSet.has(i));
  // reaching the last checkpoint already requires watching most of the lesson
  const canComplete = allChecked;

  const { prev, next, index, total } = lessonNeighbours(track, lesson.slug);

  const onComplete = () => {
    completeLesson(key, lesson.xp, lesson.title);
    setJustCompleted(true);
    setTimeout(() => setJustCompleted(false), 3000);
  };

  const TABS: { id: TabId; label: string; Icon: typeof ListChecks; badge?: string }[] = [
    {
      id: "quiz",
      label: "隨堂測驗",
      Icon: ListChecks,
      badge:
        lesson.checkpoints.length > 0
          ? (hydrated ? answeredSet.size : 0) + "/" + lesson.checkpoints.length
          : undefined,
    },
    { id: "lab", label: "實戰 Lab", Icon: FlaskConical },
    { id: "notes", label: "筆記", Icon: NotebookPen },
    { id: "qa", label: "問答", Icon: MessageSquare },
  ];

  return (
    <div className="flex min-w-0 flex-col gap-5">
      {/* header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2.5">
            <span
              className="font-mono text-[11px] tracking-[0.16em]"
              style={{ color: track.color }}
            >
              {track.en.toUpperCase()} · 第 {index + 1} / {total} 課
            </span>
            {hydrated && isDone ? (
              <span className="flex items-center gap-1 rounded border border-accent/40 bg-accent/10 px-1.5 py-0.5 font-mono text-[10px] text-accent">
                <Check size={10} strokeWidth={3} />
                已完成
              </span>
            ) : null}
          </div>
          <h1 className="mt-1.5 text-balance text-[26px] font-extrabold leading-tight tracking-tight sm:text-[30px]">
            {lesson.title}
          </h1>
          <p className="mt-2 max-w-2xl text-[14px] leading-relaxed text-fg-2">
            {lesson.summary}
          </p>
        </div>

        <div className="flex shrink-0 flex-wrap items-center gap-4 font-mono text-[11.5px] text-fg-3">
          <span className="flex items-center gap-1.5">
            <Clock size={13} />
            {formatMinutes(lesson.durationSec)}
          </span>
          <span className="flex items-center gap-1.5">
            <ListChecks size={13} />
            {lesson.checkpoints.length} 檢查站
          </span>
          <span className="flex items-center gap-1.5 text-accent">
            <Zap size={13} />+{lesson.xp} XP
          </span>
          <DifficultyBadge level={track.difficulty} />
        </div>
      </div>

      {hydrated && !canRecord ? (
        <div className="flex flex-wrap items-center gap-3 rounded-xl border border-amber/40 bg-amber/[0.07] px-4 py-3">
          <Lock size={15} className="shrink-0 text-amber" />
          <p className="min-w-0 flex-1 text-[13px] leading-relaxed text-fg-2">
            目前沒有開放未登入者累積進度。你還是可以把這一課看完，但觀看位置、檢查站與筆記都不會留下來。
          </p>
          <LinkButton href="?login" variant="outline" size="sm">
            登入才能記錄
          </LinkButton>
        </div>
      ) : null}

      {/* stage + panel */}
      <div className="grid gap-5 xl:grid-cols-[1.55fr_1fr]">
        <div className="flex min-w-0 flex-col gap-5">
          {canResume ? (
            <button
              onClick={() => {
                setPosition(watched);
                setPlaying(true);
              }}
              className="flex items-center gap-2.5 rounded-xl border border-line bg-bg-2 px-4 py-3 text-left transition-colors hover:border-accent/50"
            >
              <RotateCcw size={14} className="shrink-0 text-accent" />
              <span className="text-[13px] text-fg-2">
                上次看到 {Math.round(watched * 100)}%，
                <span className="font-semibold text-fg">從這裡繼續</span>
              </span>
            </button>
          ) : null}
          <VideoStage
            lesson={lesson}
            video={video}
            index={index}
            position={position}
            playing={playing}
            accent={track.color}
            blocked={gateIndex !== null}
            speed={speed}
            captions={captions}
            onTogglePlay={() => {
              if (gateIndex !== null) return;
              const gate = nextGate(position);
              if (gate !== null && position >= lesson.checkpoints[gate].at) {
                setGateIndex(gate);
                setTab("quiz");
                return;
              }
              setPlaying((v) => !v);
            }}
            onSeek={(p) => {
              const gate = nextGate(p);
              if (gate !== null) {
                setPosition(lesson.checkpoints[gate].at);
                setGateIndex(gate);
                setTab("quiz");
                setPlaying(false);
              } else {
                setPosition(p);
              }
            }}
            onRestart={() => {
              setPosition(0);
              setPlaying(false);
              setGateIndex(null);
            }}
            onSpeedChange={setSpeed}
            onToggleCaptions={() => setCaptions((v) => !v)}
            onProgress={onProgress}
            onPlayingChange={(v) => {
              // the player itself was clicked; a gate still wins
              if (v && gateIndex !== null) {
                setPlaying(false);
                return;
              }
              setPlaying(v);
            }}
            onEnded={() => {
              setPosition(1);
              setPlaying(false);
            }}
          />

          {gateIndex !== null ? (
            <div className="flex items-center gap-3 rounded-xl border border-amber/40 bg-amber/[0.07] px-4 py-3">
              <Lock size={15} className="shrink-0 text-amber" />
              <p className="text-[13px] text-fg-2">
                影片停在知識點檢查站。答對右邊的題目就會繼續播放。
              </p>
            </div>
          ) : null}

          <div className="card p-6">
            <div className="mono-label mb-4">本課內容</div>
            <ContentBlocks blocks={lesson.content} />
          </div>
        </div>

        {/* right panel */}
        <div className="flex min-w-0 flex-col">
          <div className="card sticky top-20 flex max-h-[calc(100vh-6rem)] flex-col overflow-hidden">
            <div className="flex shrink-0 border-b border-line">
              {TABS.map((t) => (
                <button
                  key={t.id}
                  onClick={() => setTab(t.id)}
                  className={cn(
                    "relative flex flex-1 items-center justify-center gap-1.5 whitespace-nowrap px-1 py-3 text-[12.5px] font-semibold transition-colors",
                    tab === t.id ? "text-fg" : "text-fg-3 hover:text-fg-2",
                  )}
                >
                  <t.Icon size={14} />
                  <span className="hidden sm:inline">{t.label}</span>
                  {t.badge ? (
                    <span className="rounded bg-bg-4 px-1 font-mono text-[9.5px] text-fg-2">
                      {t.badge}
                    </span>
                  ) : null}
                  {tab === t.id ? (
                    <span className="absolute inset-x-2 bottom-0 h-0.5 rounded-full bg-accent" />
                  ) : null}
                </button>
              ))}
            </div>

            <div className="flex-1 overflow-y-auto p-4">
              {tab === "quiz" ? (
                <div className="flex flex-col gap-3">
                  {lesson.checkpoints.length === 0 ? (
                    <p className="py-8 text-center text-[13px] text-fg-3">
                      這一課沒有檢查站，直接看完就好。
                    </p>
                  ) : (
                    lesson.checkpoints.map((c, i) => {
                      const isAnswered = hydrated && answeredSet.has(i);
                      const unlocked = position >= c.at || isAnswered;
                      if (!unlocked) return <LockedCheckpoint key={i} at={c.at} />;
                      return (
                        <CheckpointQuiz
                          key={i}
                          checkpoint={c}
                          index={i}
                          total={lesson.checkpoints.length}
                          answered={isAnswered}
                          accent={track.color}
                          onCorrect={() => {
                            answerCheckpoint(key, i, c.xp);
                            if (gateIndex === i) {
                              setGateIndex(null);
                              setTimeout(() => setPlaying(true), 550);
                            }
                          }}
                        />
                      );
                    })
                  )}
                  {allChecked ? <AllCheckpointsDone accent={track.color} /> : null}
                </div>
              ) : null}

              {tab === "lab" ? (
                lab ? (
                  <div className="flex flex-col gap-4">
                    <div className="flex items-center gap-2">
                      <FlaskConical size={15} className="text-teal" />
                      <span className="text-[13.5px] font-bold">隨堂實戰</span>
                    </div>
                    <p className="text-[13px] leading-relaxed text-fg-2">
                      這一課學到的東西，馬上在一個真的環境裡打一次。
                    </p>
                    <div className="rounded-xl border border-line bg-bg-3/40 p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="text-[15px] font-bold">{lab.name}</div>
                          <div className="mt-0.5 font-mono text-[11px] text-fg-3">
                            {lab.category.toUpperCase()} · {lab.points} pts
                          </div>
                        </div>
                        <DifficultyBadge level={lab.difficulty} />
                      </div>
                      <p className="mt-3 text-[13px] leading-relaxed text-fg-2">
                        {lab.blurb}
                      </p>
                      <LinkButton
                        href={"/challenges/" + lab.slug}
                        size="sm"
                        className="mt-4 w-full"
                      >
                        <Flag size={13} />
                        開始這題
                      </LinkButton>
                    </div>
                    <p className="text-[12px] leading-relaxed text-fg-3">
                      解出來會拿到 {lab.points} 分，並記在你的檔案裡。卡住的話，右邊的問答隨時可以發問。
                    </p>
                  </div>
                ) : (
                  <p className="py-8 text-center text-[13px] text-fg-3">
                    這一課是觀念課，沒有配對應的 Lab。
                  </p>
                )
              ) : null}

              {tab === "notes" ? (
                <div className="flex h-full flex-col gap-3">
                  <div className="flex items-center justify-between">
                    <span className="mono-label">我的筆記</span>
                    <span className="font-mono text-[10.5px] text-fg-3">
                      {!canRecord ? "登入才能保存" : authenticated ? "自動儲存到你的帳號" : "自動儲存在這台裝置"}
                    </span>
                  </div>
                  <textarea
                    value={hydrated ? note : ""}
                    readOnly={!canRecord}
                    onChange={(e) => setNote(key, e.target.value)}
                    placeholder={
                      "在這裡記下你的理解、卡住的地方、想之後再查的東西。\n\n例如：\n- 為什麼兩個減號能註解掉後面？\n- 參數化查詢要在哪一層做？"
                    }
                    className="min-h-[280px] flex-1 resize-none rounded-xl border border-line bg-bg-0 p-4 font-mono text-[12.5px] leading-relaxed text-fg outline-none transition-colors placeholder:text-fg-3 focus:border-accent/50"
                  />
                </div>
              ) : null}

              {tab === "qa" ? <QaPanel scope="lesson" refId={key} compact /> : null}
            </div>

            {/* complete bar */}
            <div className="shrink-0 border-t border-line bg-bg-1/60 p-4">
              <div className="mb-2.5 flex items-center justify-between">
                <span className="mono-label">完成條件</span>
                <span className="font-mono text-[11px] text-fg-2">
                  {hydrated ? answeredSet.size : 0} / {lesson.checkpoints.length} 檢查站
                </span>
              </div>
              <ProgressBar
                value={
                  lesson.checkpoints.length === 0
                    ? position
                    : (hydrated ? answeredSet.size : 0) / lesson.checkpoints.length
                }
                color={track.color}
                className="mb-3"
              />
              {hydrated && isDone ? (
                <Button variant="outline" className="w-full" disabled>
                  <Check size={15} />
                  本課已完成
                </Button>
              ) : (
                <Button
                  className="w-full"
                  variant={canComplete && canRecord ? "primary" : "outline"}
                  disabled={!canComplete || !canRecord}
                  onClick={onComplete}
                >
                  {!canRecord ? (
                    <>
                      <Lock size={14} />
                      登入才能記錄完成
                    </>
                  ) : canComplete ? (
                    <>
                      <Check size={15} />
                      標記完成 +{lesson.xp} XP
                    </>
                  ) : (
                    <>
                      <Lock size={14} />
                      完成所有檢查站以解鎖
                    </>
                  )}
                </Button>
              )}
              {justCompleted ? (
                <p className="mt-2 text-center font-mono text-[11.5px] text-accent">
                  +{lesson.xp} XP 已入帳
                </p>
              ) : null}
            </div>
          </div>
        </div>
      </div>

      {/* footer nav */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-t border-line pt-6">
        {prev ? (
          <LinkButton
            href={"/learn/" + track.slug + "/" + prev.slug}
            variant="outline"
            size="sm"
          >
            <ArrowLeft size={14} />
            上一課
          </LinkButton>
        ) : (
          <Link
            href={"/learn/" + track.slug}
            className="flex items-center gap-2 text-[13px] text-fg-3 hover:text-fg"
          >
            <ArrowLeft size={14} />
            回到課程大綱
          </Link>
        )}

        <p className="hidden text-[12.5px] text-fg-3 sm:block">
          {allChecked
            ? "檢查站都過了，可以往下一課"
            : "完成所有 " + lesson.checkpoints.length + " 個知識點檢查站以解鎖下一課"}
        </p>

        {next ? (
          <LinkButton
            href={"/learn/" + track.slug + "/" + next.slug}
            size="sm"
            className={cn(!allChecked && "pointer-events-none opacity-40")}
          >
            下一課：{next.title.split("：")[0]}
            <ArrowRight size={14} />
          </LinkButton>
        ) : (
          <LinkButton href="/challenges" size="sm">
            <Flag size={14} />
            去題庫實戰
          </LinkButton>
        )}
      </div>
    </div>
  );
}
