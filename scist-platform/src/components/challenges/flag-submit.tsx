"use client";

import { useState } from "react";
import { Flag, Check, X, Loader2, PartyPopper, Droplet } from "lucide-react";
import { Button } from "@/components/ui/primitives";
import type { AttemptResult } from "@/lib/flags";
import { api } from "@/lib/api";
import type { Challenge } from "@/data/challenges";
import { useProgress, useHydrated, refreshProfile } from "@/store/progress";
import { LoginWall } from "@/components/login-wall";
import { cn } from "@/lib/utils";

type Feedback = { ok: boolean; message: string; firstBlood?: boolean } | null;

/** Flag submission. Every attempt goes to the server; the browser holds no flag or digest. */
export function FlagSubmit({ challenge }: { challenge: Challenge }) {
  const got = useProgress((s) => s.solved[challenge.slug]);
  const solveFlag = useProgress((s) => s.solveFlag);
  const authenticated = useProgress((s) => s.authenticated);
  const sessionChecked = useProgress((s) => s.sessionChecked);
  const hydrated = useHydrated();

  const [value, setValue] = useState("");
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState<Feedback>(null);

  // the page is gated in src/proxy.ts; this only shows when the session died mid-page
  if (hydrated && sessionChecked && !authenticated) {
    return <LoginWall title="登入後才能提交 Flag" desc="解題會記到你的帳號、排行榜與 First Blood。登入或註冊後會直接回到這一題。" />;
  }

  const solvedIds = hydrated ? (got ?? []) : [];
  const allDone = solvedIds.length === challenge.flags.length;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!value.trim() || busy) return;
    setBusy(true);
    setFeedback(null);

    let res: AttemptResult;
    try {
      res = await api<AttemptResult>("/api/challenges/" + challenge.slug + "/attempt", { body: { flag: value } });
    } catch (err) {
      setFeedback({ ok: false, message: err instanceof Error ? err.message : "送出失敗，再試一次。" });
      setBusy(false);
      return;
    }

    if (res.status === "correct" && res.flagId) {
      const spec = challenge.flags.find((f) => f.id === res.flagId);
      const points = res.points ?? spec?.points ?? 0;
      const refund = res.refunded ? "，退還提示 " + res.refunded + " XP" : "";
      solveFlag(challenge.slug, res.flagId, points, challenge.name);
      setFeedback({ ok: true, message: res.message + " +" + points + " 分" + refund, firstBlood: res.firstBlood });
      setValue("");
      void refreshProfile(true);
    } else if (res.status === "already_solved") {
      setFeedback({ ok: true, message: res.message });
    } else {
      setFeedback({ ok: false, message: res.message });
    }
    setBusy(false);
  };

  return (
    <div
      className={cn(
        "card p-5 transition-colors",
        allDone && "border-accent/40 bg-accent/[0.04]",
      )}
    >
      <div className="flex items-center gap-2">
        <Flag size={15} className={allDone ? "text-accent" : "text-fg-3"} />
        <span className="text-[13.5px] font-bold">提交 Flag</span>
        <span className="ml-auto font-mono text-[11.5px] text-fg-3">
          {solvedIds.length}/{challenge.flags.length}
        </span>
      </div>

      {/* per-flag state */}
      <div className="mt-3 flex flex-col gap-2">
        {challenge.flags.map((f) => {
          const done = solvedIds.includes(f.id);
          return (
            <div
              key={f.id}
              className={cn(
                "flex items-center gap-2.5 rounded-lg border px-3 py-2",
                done
                  ? "border-accent/45 bg-accent/10"
                  : "border-line bg-bg-3/40",
              )}
            >
              <span
                className={cn(
                  "grid h-5 w-5 shrink-0 place-items-center rounded-md border",
                  done ? "border-accent bg-accent text-bg-0" : "border-line-2 text-fg-3",
                )}
              >
                {done ? <Check size={11} strokeWidth={3} /> : <Flag size={10} />}
              </span>
              <span
                className={cn(
                  "flex-1 text-[13px] font-semibold",
                  done ? "text-accent" : "text-fg-2",
                )}
              >
                {f.label}
              </span>
              <span className="font-mono text-[11.5px] text-fg-3">{f.points} pts</span>
            </div>
          );
        })}
      </div>

      {allDone ? (
        <div className="mt-4 flex items-center gap-2.5 rounded-lg border border-accent/40 bg-accent/10 px-3 py-3">
          <PartyPopper size={16} className="shrink-0 text-accent" />
          <p className="text-[13px] leading-relaxed text-fg">
            這題被你完整拿下了。去排行榜看看你的位置。
          </p>
        </div>
      ) : (
        <form onSubmit={submit} className="mt-4">
          <div className="flex items-center gap-2 rounded-lg border border-line bg-bg-0 px-3 focus-within:border-accent/50">
            <span className="shrink-0 font-mono text-[13px] text-fg-3">$</span>
            <input
              value={value}
              onChange={(e) => setValue(e.target.value)}
              placeholder="SCIST{...}"
              spellCheck={false}
              autoComplete="off"
              className="h-11 w-full bg-transparent font-mono text-[13px] text-fg outline-none placeholder:text-fg-3"
            />
          </div>
          <Button
            type="submit"
            className="mt-2.5 w-full"
            variant={value.trim() ? "primary" : "outline"}
            disabled={busy || !value.trim()}
          >
            {busy ? (
              <>
                <Loader2 size={14} className="animate-spin" />
                驗證中
              </>
            ) : (
              <>
                <Flag size={14} />
                送出
              </>
            )}
          </Button>
        </form>
      )}

      {feedback ? (
        <div
          className={cn(
            "mt-3 flex items-start gap-2 rounded-lg border px-3 py-2.5",
            feedback.ok
              ? "border-accent/40 bg-accent/10"
              : "border-red/40 bg-red/10",
          )}
        >
          {feedback.firstBlood ? (
            <Droplet size={14} className="mt-0.5 shrink-0 text-red" />
          ) : feedback.ok ? (
            <Check size={14} className="mt-0.5 shrink-0 text-accent" strokeWidth={3} />
          ) : (
            <X size={14} className="mt-0.5 shrink-0 text-red" strokeWidth={3} />
          )}
          <p
            className={cn(
              "text-[12.5px] leading-relaxed",
              feedback.ok ? "text-accent" : "text-fg-2",
            )}
          >
            {feedback.firstBlood ? "First Blood！" + feedback.message : feedback.message}
          </p>
        </div>
      ) : null}

      <p className="mt-3 border-t border-line pt-3 font-mono text-[11px] leading-relaxed text-fg-3">
        Flag 在伺服器端比對，解出會記到你的帳號、排行榜與 First Blood。
      </p>
    </div>
  );
}
