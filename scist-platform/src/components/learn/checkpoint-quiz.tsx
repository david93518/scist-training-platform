"use client";

import { useState } from "react";
import { Check, X, Zap, Lock, ListChecks, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatTimecode } from "@/lib/checkpoint";
import type { Checkpoint } from "@/data/tracks";

/** What the server says about one submitted answer. */
export interface CheckpointVerdict {
  correct: boolean;
  explain?: string;
}

/**
 * One knowledge check. The correct option is not in the browser: every pick is
 * sent to the server, which awards the XP and hands back the explanation only
 * when the answer was right.
 */
export function CheckpointQuiz({
  checkpoint,
  index,
  total,
  answered,
  reveal,
  accent,
  onAnswer,
}: {
  checkpoint: Checkpoint;
  index: number;
  total: number;
  answered: boolean;
  /** already passed on an earlier visit: the answer key is safe to show again */
  reveal?: { answer: number; explain: string };
  accent: string;
  onAnswer: (choice: number) => Promise<CheckpointVerdict>;
}) {
  const [correctIndex, setCorrectIndex] = useState<number | null>(reveal ? reveal.answer : null);
  const [explain, setExplain] = useState<string>(reveal?.explain ?? "");
  const [wrong, setWrong] = useState<number[]>([]);
  const [busy, setBusy] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const settled = answered || correctIndex !== null;

  const choose = async (i: number) => {
    if (settled || busy !== null || wrong.includes(i)) return;
    setBusy(i);
    setError(null);
    try {
      const verdict = await onAnswer(i);
      if (verdict.correct) {
        setCorrectIndex(i);
        setExplain(verdict.explain ?? "");
      } else {
        setWrong((w) => (w.includes(i) ? w : [...w, i]));
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "送出失敗，再試一次。");
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="rounded-xl border border-line bg-bg-2 p-4">
      <div className="flex items-center justify-between">
        <span className="mono-label">
          知識點檢查站 {index + 1} / {total}
        </span>
        <span
          className="flex items-center gap-1 font-mono text-[11px]"
          style={{ color: settled ? accent : "var(--color-fg-3)" }}
        >
          <Zap size={11} />+{checkpoint.xp} XP
        </span>
      </div>

      <p className="mt-3 text-[14.5px] font-semibold leading-relaxed text-fg">
        {checkpoint.question}
      </p>

      <div className="mt-3.5 flex flex-col gap-2">
        {checkpoint.options.map((opt, i) => {
          const isWrong = wrong.includes(i);
          const show = correctIndex === i;
          const loading = busy === i;
          return (
            <button
              key={i}
              onClick={() => void choose(i)}
              disabled={settled || busy !== null || isWrong}
              className={cn(
                "flex items-center gap-3 rounded-lg border px-3.5 py-2.5 text-left text-[13.5px] transition-all",
                show
                  ? "border-accent/60 bg-accent/10 text-fg"
                  : isWrong
                    ? "border-red/50 bg-red/10 text-fg-2"
                    : "border-line bg-bg-3/50 text-fg-2 hover:border-line-2 hover:text-fg",
                settled && !show && "opacity-55",
              )}
            >
              <span
                className={cn(
                  "grid h-5 w-5 shrink-0 place-items-center rounded-md border font-mono text-[10px]",
                  show
                    ? "border-accent bg-accent text-bg-0"
                    : isWrong
                      ? "border-red text-red"
                      : "border-line-2 text-fg-3",
                )}
              >
                {loading ? (
                  <Loader2 size={11} className="animate-spin" />
                ) : show ? (
                  <Check size={11} strokeWidth={3} />
                ) : isWrong ? (
                  <X size={11} strokeWidth={3} />
                ) : (
                  String.fromCharCode(65 + i)
                )}
              </span>
              <span className="flex-1">{opt}</span>
            </button>
          );
        })}
      </div>

      {error ? <p className="mt-3 text-[12.5px] text-red">{error}</p> : null}

      {settled ? (
        explain ? (
          <div className="mt-3 rounded-lg border border-accent/25 bg-accent/[0.07] p-3">
            <div className="mono-label mb-1" style={{ color: accent }}>
              解析
            </div>
            <p className="text-[13px] leading-relaxed text-fg-2">{explain}</p>
          </div>
        ) : (
          <p className="mt-3 text-[12.5px] text-accent">答對了。</p>
        )
      ) : wrong.length > 0 ? (
        <p className="mt-3 text-[12.5px] text-fg-3">再想一下。把左邊的進度條往回拉，可以重看那一段影片。</p>
      ) : null}
    </div>
  );
}

export function LockedCheckpoint({ atSec }: { atSec: number }) {
  return (
    <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed border-line py-8 text-center">
      <Lock size={18} className="text-fg-3" />
      <p className="text-[13px] text-fg-3">
        影片播放到 {formatTimecode(atSec)} 後解鎖
      </p>
    </div>
  );
}

export function AllCheckpointsDone({ accent }: { accent: string }) {
  return (
    <div
      className="flex flex-col items-center gap-2 rounded-xl border py-8 text-center"
      style={{ borderColor: accent + "44", background: accent + "0d" }}
    >
      <ListChecks size={20} style={{ color: accent }} />
      <p className="text-[13.5px] font-semibold text-fg">這一課的檢查站都通過了</p>
      <p className="text-[12.5px] text-fg-3">往下一課前，記得去做隨堂 Lab</p>
    </div>
  );
}
