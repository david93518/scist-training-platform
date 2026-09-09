"use client";

import { useMemo, useState } from "react";
import { Search, SlidersHorizontal, X, Check, Flag, Trophy, Percent } from "lucide-react";
import { Icon } from "@/components/ui/icon";
import { ChallengeCard } from "@/components/challenges/challenge-card";
import { CATEGORY_META, type Category, type Challenge } from "@/data/challenges";
import { DIFFICULTY, type Difficulty } from "@/lib/xp";
import { useProgress, useHydrated } from "@/store/progress";
import { cn, formatNumber } from "@/lib/utils";

type StatusFilter = "all" | "unsolved" | "solved";
type SortKey = "newest" | "points" | "solves" | "rating";

const SORTS: { id: SortKey; label: string }[] = [
  { id: "newest", label: "最新上線" },
  { id: "points", label: "分數高到低" },
  { id: "solves", label: "最多人解" },
  { id: "rating", label: "評價最高" },
];

export function Arena({ challenges }: { challenges: Challenge[] }) {
  const solved = useProgress((s) => s.solved);
  const hydrated = useHydrated();

  const [q, setQ] = useState("");
  const [cats, setCats] = useState<Category[]>([]);
  const [diffs, setDiffs] = useState<Difficulty[]>([]);
  const [status, setStatus] = useState<StatusFilter>("all");
  const [sort, setSort] = useState<SortKey>("newest");
  const [showFilters, setShowFilters] = useState(false);

  const isSolved = (slug: string) => {
    const ch = challenges.find((c) => c.slug === slug);
    if (!ch) return false;
    return (solved[slug]?.length ?? 0) === ch.flags.length;
  };

  const solvedCount = hydrated
    ? challenges.filter((c) => isSolved(c.slug)).length
    : 0;
  const earned = hydrated
    ? challenges.reduce((sum, c) => {
        const got = solved[c.slug] ?? [];
        return sum + c.flags.filter((f) => got.includes(f.id)).reduce((s, f) => s + f.points, 0);
      }, 0)
    : 0;

  const toggle = <T,>(list: T[], value: T, set: (v: T[]) => void) =>
    set(list.includes(value) ? list.filter((v) => v !== value) : [...list, value]);

  const results = useMemo(() => {
    let out = challenges.filter((c) => {
      if (cats.length && !cats.includes(c.category)) return false;
      if (diffs.length && !diffs.includes(c.difficulty)) return false;
      if (q) {
        const hay = (c.name + " " + c.blurb + " " + c.tags.join(" ")).toLowerCase();
        if (!hay.includes(q.toLowerCase())) return false;
      }
      if (hydrated && status !== "all") {
        const s = isSolved(c.slug);
        if (status === "solved" && !s) return false;
        if (status === "unsolved" && s) return false;
      }
      return true;
    });

    out = [...out].sort((a, b) => {
      if (sort === "points") return b.points - a.points;
      if (sort === "solves") return b.solves - a.solves;
      if (sort === "rating") return b.rating - a.rating;
      return new Date(b.releasedAt).getTime() - new Date(a.releasedAt).getTime();
    });
    return out;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q, cats, diffs, status, sort, hydrated, solved, challenges]);

  const activeFilters = cats.length + diffs.length + (status !== "all" ? 1 : 0);

  return (
    <div>
      {/* stat strip */}
      <div className="grid gap-3 sm:grid-cols-4">
        {[
          { Icon: Flag, v: challenges.length - solvedCount, l: "還沒解的", c: "var(--color-accent)" },
          { Icon: Check, v: solvedCount, l: "你已解出", c: "var(--color-teal)" },
          { Icon: Trophy, v: formatNumber(earned), l: "你的得分", c: "var(--color-amber)" },
          {
            Icon: Percent,
            v: Math.round((solvedCount / Math.max(1, challenges.length)) * 100) + "%",
            l: "完成率",
            c: "var(--color-purple)",
          },
        ].map((s) => (
          <div key={s.l} className="card flex items-center gap-3 p-4">
            <span
              className="grid h-9 w-9 shrink-0 place-items-center rounded-xl"
              style={{ background: s.c + "18", color: s.c }}
            >
              <s.Icon size={16} />
            </span>
            <div>
              <div className="font-mono text-[18px] font-bold tabular-nums leading-none">
                {s.v}
              </div>
              <div className="mt-1 text-[11.5px] text-fg-3">{s.l}</div>
            </div>
          </div>
        ))}
      </div>

      {/* controls */}
      <div className="mt-6 flex flex-wrap items-center gap-3">
        <div className="flex h-10 min-w-[220px] flex-1 items-center gap-2 rounded-lg border border-line bg-bg-2 px-3">
          <Search size={15} className="shrink-0 text-fg-3" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="搜尋題目名稱、技巧、標籤"
            className="w-full bg-transparent text-[13.5px] text-fg outline-none placeholder:text-fg-3"
          />
          {q ? (
            <button onClick={() => setQ("")} aria-label="清除搜尋">
              <X size={14} className="text-fg-3 hover:text-fg" />
            </button>
          ) : null}
        </div>

        <div className="flex rounded-lg border border-line bg-bg-2 p-0.5">
          {(
            [
              { id: "all", label: "全部" },
              { id: "unsolved", label: "未解" },
              { id: "solved", label: "已解" },
            ] as const
          ).map((s) => (
            <button
              key={s.id}
              onClick={() => setStatus(s.id)}
              className={cn(
                "rounded-md px-3 py-1.5 text-[12.5px] font-semibold transition-colors",
                status === s.id ? "bg-bg-4 text-fg" : "text-fg-3 hover:text-fg-2",
              )}
            >
              {s.label}
            </button>
          ))}
        </div>

        <select
          value={sort}
          onChange={(e) => setSort(e.target.value as SortKey)}
          className="h-10 rounded-lg border border-line bg-bg-2 px-3 text-[12.5px] text-fg-2 outline-none"
        >
          {SORTS.map((s) => (
            <option key={s.id} value={s.id}>
              {s.label}
            </option>
          ))}
        </select>

        <button
          onClick={() => setShowFilters((v) => !v)}
          className={cn(
            "flex h-10 items-center gap-2 rounded-lg border px-3 text-[12.5px] font-semibold transition-colors",
            activeFilters
              ? "border-accent/50 bg-accent/10 text-accent"
              : "border-line bg-bg-2 text-fg-2 hover:text-fg",
          )}
        >
          <SlidersHorizontal size={14} />
          篩選
          {activeFilters ? (
            <span className="rounded bg-accent px-1 font-mono text-[10px] text-bg-0">
              {activeFilters}
            </span>
          ) : null}
        </button>
      </div>

      {showFilters ? (
        <div className="card mt-3 flex flex-col gap-4 p-4">
          <div>
            <div className="mono-label mb-2.5">類別</div>
            <div className="flex flex-wrap gap-2">
              {(Object.keys(CATEGORY_META) as Category[]).map((c) => {
                const m = CATEGORY_META[c];
                const on = cats.includes(c);
                return (
                  <button
                    key={c}
                    onClick={() => toggle(cats, c, setCats)}
                    className={cn(
                      "flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-[12.5px] font-semibold transition-colors",
                      on ? "text-bg-0" : "border-line bg-bg-3/50 text-fg-2 hover:text-fg",
                    )}
                    style={
                      on
                        ? { background: m.color, borderColor: m.color }
                        : undefined
                    }
                  >
                    <Icon name={m.icon} size={13} />
                    {m.label}
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <div className="mono-label mb-2.5">難度</div>
            <div className="flex flex-wrap gap-2">
              {(Object.keys(DIFFICULTY) as Difficulty[]).map((d) => {
                const m = DIFFICULTY[d];
                const on = diffs.includes(d);
                return (
                  <button
                    key={d}
                    onClick={() => toggle(diffs, d, setDiffs)}
                    className={cn(
                      "rounded-lg border px-2.5 py-1.5 text-[12.5px] font-semibold transition-colors",
                      on ? "text-bg-0" : "border-line bg-bg-3/50 text-fg-2 hover:text-fg",
                    )}
                    style={on ? { background: m.color, borderColor: m.color } : undefined}
                  >
                    {m.label} · {m.points}
                  </button>
                );
              })}
            </div>
          </div>

          {activeFilters ? (
            <button
              onClick={() => {
                setCats([]);
                setDiffs([]);
                setStatus("all");
              }}
              className="self-start text-[12.5px] text-fg-3 underline-offset-4 hover:text-fg hover:underline"
            >
              清除所有篩選
            </button>
          ) : null}
        </div>
      ) : null}

      <div className="mt-5 flex items-center justify-between">
        <span className="font-mono text-[12px] text-fg-3">
          {results.length} 題符合條件
        </span>
      </div>

      {results.length === 0 ? (
        <div className="card mt-4 py-16 text-center">
          <p className="text-[14px] text-fg-2">沒有符合條件的題目。</p>
          <p className="mt-1 text-[12.5px] text-fg-3">換個關鍵字或把篩選清掉試試。</p>
        </div>
      ) : (
        <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {results.map((c, i) => (
            <ChallengeCard key={c.id} challenge={c} delay={Math.min(i, 8) * 40} />
          ))}
        </div>
      )}
    </div>
  );
}
