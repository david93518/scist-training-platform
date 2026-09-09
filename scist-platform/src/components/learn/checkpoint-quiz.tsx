"use client";

import { useState } from "react";
import { Check, X, Zap, Lock, ListChecks } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Checkpoint } from "@/data/tracks";

export function CheckpointQuiz({
  checkpoint,
  index,
  total,
  answered,
  accent,
  onCorrect,
}: {
  checkpoint: Checkpoint;
  index: number;
  total: number;
  answered: boolean;
  accent: string;
  onCorrect: () => void;
}) {
  const [picked, setPicked] = useState<number | null>(null);
  const [wrong, setWrong] = useState<number[]>([]);
  const settled = answered || picked === checkpoint.answer;

  const choose = (i: number) => {
    if (settled) return;
    setPicked(i);
    if (i === checkpoint.answer) onCorrect();
    else setWrong((w) => (w.includes(i) ? w : [...w, i]));
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
          const isAnswer = i === checkpoint.answer;
          const isWrong = wrong.includes(i);
          const show = settled && isAnswer;
          return (
            <button
              key={i}
              onClick={() => choose(i)}
              disabled={settled}
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
                {show ? (
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

      {settled ? (
        <div className="mt-3 rounded-lg border border-accent/25 bg-accent/[0.07] p-3">
          <div className="mono-label mb-1" style={{ color: accent }}>
            解析
          </div>
          <p className="text-[13px] leading-relaxed text-fg-2">{checkpoint.explain}</p>
        </div>
      ) : wrong.length > 0 ? (
        <p className="mt-3 text-[12.5px] text-fg-3">再想一下，可以回去看那一段影片。</p>
      ) : null}
    </div>
  );
}

export function LockedCheckpoint({ at }: { at: number }) {
  return (
    <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed border-line py-8 text-center">
      <Lock size={18} className="text-fg-3" />
      <p className="text-[13px] text-fg-3">
        影片播放到 {Math.round(at * 100)}% 後解鎖
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
