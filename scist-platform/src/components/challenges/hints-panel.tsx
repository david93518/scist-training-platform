"use client";

import { useState } from "react";
import { Lightbulb, Loader2, Lock, Minus } from "lucide-react";
import { Button } from "@/components/ui/primitives";
import { api } from "@/lib/api";
import type { Challenge } from "@/data/challenges";
import { useProgress, useHydrated, refreshProfile } from "@/store/progress";
import { cn } from "@/lib/utils";

export function HintsPanel({ challenge }: { challenge: Challenge }) {
  const revealed = useProgress((s) => s.revealedHints[challenge.slug]);
  const reveal = useProgress((s) => s.revealHint);
  const authenticated = useProgress((s) => s.authenticated);
  const hydrated = useHydrated();
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  // hint text handed back by the server (the public data already carries it,
  // but the server copy is authoritative once signed in)
  const [texts, setTexts] = useState<Record<string, string>>({});

  if (challenge.hints.length === 0) return null;
  const open = hydrated ? (revealed ?? []) : [];

  const unlock = async (hintId: string, cost: number) => {
    setError(null);
    if (!authenticated) {
      reveal(challenge.slug, hintId, cost);
      return;
    }
    setBusy(hintId);
    try {
      const res = await api<{ text: string; cost: number }>("/api/challenges/" + challenge.slug + "/hints/" + hintId, { method: "POST" });
      setTexts((t) => ({ ...t, [hintId]: res.text }));
      reveal(challenge.slug, hintId, res.cost);
      void refreshProfile(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "解鎖失敗");
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="card p-5">
      <div className="flex items-center gap-2">
        <Lightbulb size={15} className="text-amber" />
        <span className="text-[13.5px] font-bold">提示</span>
        <span className="ml-auto font-mono text-[11.5px] text-fg-3">
          {open.length}/{challenge.hints.length}
        </span>
      </div>

      <p className="mt-2 text-[12px] leading-relaxed text-fg-3">
        每則提示會扣掉一些 XP。先自己想想，卡超過三十分鐘再開。
      </p>

      <div className="mt-3.5 flex flex-col gap-2.5">
        {challenge.hints.map((h, i) => {
          const isOpen = open.includes(h.id);
          const prevOpen = i === 0 || open.includes(challenge.hints[i - 1].id);
          return (
            <div
              key={h.id}
              className={cn(
                "rounded-lg border p-3.5 transition-colors",
                isOpen ? "border-amber/35 bg-amber/[0.07]" : "border-line bg-bg-3/40",
              )}
            >
              <div className="flex items-center justify-between gap-3">
                <span className="mono-label" style={isOpen ? { color: "var(--color-amber)" } : undefined}>
                  提示 {i + 1}
                </span>
                {isOpen ? null : (
                  <span className="flex items-center gap-1 font-mono text-[11px] text-fg-3">
                    <Minus size={10} />
                    {h.cost} XP
                  </span>
                )}
              </div>

              {isOpen ? (
                <p className="mt-2 text-[13px] leading-relaxed text-fg-2">{texts[h.id] ?? h.text}</p>
              ) : (
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-2.5 w-full"
                  disabled={!prevOpen || busy === h.id}
                  onClick={() => unlock(h.id, h.cost)}
                >
                  {busy === h.id ? <Loader2 size={12} className="animate-spin" /> : <Lock size={12} />}
                  {prevOpen ? "解鎖這則提示" : "先解鎖上一則"}
                </Button>
              )}
            </div>
          );
        })}
      </div>
      {error ? <p className="mt-3 text-[12px] text-red">{error}</p> : null}
    </div>
  );
}
