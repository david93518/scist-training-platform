"use client";

/**
 * KPI page. Charts follow the dataviz rules: one hue for magnitude, entity
 * colors only as identity dots beside labels, thin marks, direct labels at
 * the tip, hover tooltips that never gate a value, and a table twin.
 */
import Link from "next/link";
import { useState } from "react";
import { Table2, TrendingDown, TrendingUp } from "lucide-react";
import { getAdminApi } from "@/admin/api";
import type { AdminAnalytics } from "@/admin/types";
import { PageTitle, SectionCard, Table, Td, Th, Tr, ToastHost, useAsync } from "@/components/admin/ui";
import { cn, formatNumber } from "@/lib/utils";

const ACCENT = "#a4f13b";
const ACCENT_HOVER = "#c9ff78";
const MUTED = "rgba(255,255,255,0.14)";

function niceMax(n: number) {
  if (n <= 0) return 1;
  const p = 10 ** Math.floor(Math.log10(n));
  const m = n / p;
  return (m <= 1 ? 1 : m <= 2 ? 2 : m <= 5 ? 5 : 10) * p;
}

function pct(n: number) {
  return Math.round(n * 100) + "%";
}

/* ------------------------------ stat tile ------------------------------ */
function StatTile({ label, value, delta, spark }: { label: string; value: number; delta?: number | null; spark?: number[] }) {
  const up = (delta ?? 0) >= 0;
  const max = Math.max(1, ...(spark ?? [1]));
  return (
    <div className="card flex items-end justify-between gap-4 p-5">
      <div className="min-w-0">
        <div className="text-[12px] text-fg-3">{label}</div>
        <div className="mt-1.5 text-[30px] font-extrabold leading-none">{formatNumber(value)}</div>
        {delta !== undefined && delta !== null ? (
          <div className={cn("mt-2 flex items-center gap-1 text-[12px] font-bold", up ? "text-accent" : "text-red")}>
            {up ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
            {up ? "+" : ""}
            {Math.round(delta * 100)}% <span className="font-normal text-fg-3">較上週</span>
          </div>
        ) : null}
      </div>
      {spark ? (
        <div className="flex h-9 items-end gap-[2px]" aria-hidden>
          {spark.map((v, i) => (
            <div key={i} className="w-1.5 rounded-t-[2px]" style={{ height: Math.max(2, (v / max) * 36), background: i === spark.length - 1 ? ACCENT : MUTED }} />
          ))}
        </div>
      ) : null}
    </div>
  );
}

/* ------------------------------ column chart ------------------------------ */
function Columns({ title, data, field }: { title: string; data: AdminAnalytics["weeks"]; field: "active" | "solves" | "completions" }) {
  const [hover, setHover] = useState<number | null>(null);
  const values = data.map((d) => d[field]);
  const top = niceMax(Math.max(...values));
  return (
    <div className="card p-5">
      <div className="flex items-baseline justify-between">
        <h3 className="text-[14px] font-extrabold">{title}</h3>
        <span className="font-mono text-[11px] text-fg-3">近 12 週</span>
      </div>
      <div className="relative mt-5 h-[150px]">
        {[0, 0.5, 1].map((f) => (
          <div key={f} className="absolute inset-x-0 border-t border-white/[0.06]" style={{ bottom: f * 100 + "%" }}>
            <span className="absolute right-0 -top-2.5 font-mono text-[10px] text-fg-3">{f === 0 ? "" : formatNumber(Math.round(top * f))}</span>
          </div>
        ))}
        <div className="absolute inset-0 flex items-end gap-[2px] pr-10">
          {values.map((v, i) => {
            const h = Math.max(v > 0 ? 2 : 0, (v / top) * 100);
            return (
              <div
                key={i}
                className="relative flex h-full min-w-0 flex-1 items-end justify-center outline-none"
                onPointerEnter={() => setHover(i)}
                onPointerLeave={() => setHover(null)}
                onFocus={() => setHover(i)}
                onBlur={() => setHover(null)}
                tabIndex={0}
                aria-label={data[i].label + " " + formatNumber(v)}
              >
                <div className="w-full max-w-[22px] rounded-t-[4px] transition-colors" style={{ height: h + "%", background: hover === i ? ACCENT_HOVER : ACCENT }} />
                {hover === i ? (
                  <div
                    className="pointer-events-none absolute left-1/2 z-10 -translate-x-1/2 whitespace-nowrap rounded-lg border border-white/[0.1] bg-bg-1 px-2.5 py-1.5 text-[12px] shadow-xl"
                    style={{ bottom: "calc(" + h + "% + 8px)" }}
                  >
                    <span className="font-mono font-bold">{formatNumber(v)}</span> <span className="text-fg-3">{data[i].label} 那週</span>
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>
      </div>
      <div className="mt-2 flex pr-10 font-mono text-[10px] text-fg-3">
        {data.map((d, i) => (
          <div key={i} className="flex-1 text-center">
            {i % 3 === 0 || i === data.length - 1 ? d.label : ""}
          </div>
        ))}
      </div>
    </div>
  );
}

/* ------------------------------ KPI vs proposal targets ------------------------------ */
/** 企劃書第 126-140 行的六個月與十二個月目標。 */
const GOALS = [
  { key: "registered", label: "平台註冊學員數", m6: 500, m12: 2000, unit: "人" },
  { key: "monthlyActive", label: "月活躍學員數", m6: 200, m12: 800, unit: "人" },
  { key: "completionRate", label: "課程完成率", m6: 0.4, m12: 0.6, unit: "%" },
  { key: "schools", label: "合作學校數", m6: 25, m12: 40, unit: "校" },
] as const;

function GoalRow({ label, value, m6, m12, unit }: { label: string; value: number; m6: number; m12: number; unit: string }) {
  const fmt = (n: number) => (unit === "%" ? pct(n) : formatNumber(n) + " " + unit);
  const hit = value / m6;
  const done = hit >= 1;
  return (
    <div className="py-2.5">
      <div className="flex items-baseline gap-2">
        <span className="truncate text-[13px] font-semibold">{label}</span>
        <span className={cn("ml-auto shrink-0 font-mono text-[12.5px] font-bold tabular-nums", done ? "text-accent" : "")}>{fmt(value)}</span>
        <span className="shrink-0 font-mono text-[10.5px] text-fg-3">6 個月目標的 {pct(Math.min(hit, 1))}</span>
      </div>
      {/* the bar is scaled to the 12-month target so both goal ticks fit on it */}
      <div className="relative mt-2 h-[6px] rounded-r-[3px] bg-white/[0.05]">
        <div className="h-full rounded-r-[3px]" style={{ width: Math.min(100, (value / m12) * 100) + "%", background: ACCENT }} />
        {[
          { at: m6, tag: "6M" },
          { at: m12, tag: "12M" },
        ].map((g) => (
          <div key={g.tag} className="absolute -top-1 h-[14px] w-px bg-white/35" style={{ left: Math.min(100, (g.at / m12) * 100) + "%" }}>
            <span className="absolute -top-[13px] -translate-x-1/2 font-mono text-[9px] text-fg-3">{g.tag}</span>
          </div>
        ))}
      </div>
      <div className="mt-1.5 font-mono text-[10.5px] text-fg-3">
        6 個月 {fmt(m6)} · 12 個月 {fmt(m12)}
        {done ? null : " · 還差 " + fmt(unit === "%" ? m6 - value : Math.ceil(m6 - value))}
      </div>
    </div>
  );
}

/* ------------------------------ horizontal bars ------------------------------ */
function BarRow({ dot, label, value, ratio, sub, title, href }: { dot?: string; label: string; value: string; ratio: number; sub?: string; title?: string; href?: string }) {
  const name = href ? (
    <Link href={href} className="truncate text-[13px] font-semibold hover:text-accent">
      {label}
    </Link>
  ) : (
    <span className="truncate text-[13px] font-semibold">{label}</span>
  );
  return (
    <div className="py-2" title={title}>
      <div className="flex items-center gap-2">
        {dot ? <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: dot }} /> : null}
        {name}
        <span className="ml-auto shrink-0 font-mono text-[12.5px] font-bold tabular-nums">{value}</span>
      </div>
      <div className="mt-1.5 flex items-center gap-3">
        <div className="h-[6px] flex-1 overflow-hidden rounded-r-[3px] bg-white/[0.05]">
          <div className="h-full rounded-r-[3px]" style={{ width: Math.max(ratio > 0 ? 0.5 : 0, ratio * 100) + "%", background: ACCENT }} />
        </div>
        {sub ? <span className="hidden w-[150px] shrink-0 text-right font-mono text-[10.5px] text-fg-3 sm:block">{sub}</span> : null}
      </div>
    </div>
  );
}

/* ------------------------------ page ------------------------------ */
export function AnalyticsAdmin() {
  const api = getAdminApi();
  const data = useAsync(() => api.analytics());
  const [table, setTable] = useState(false);
  const a = data.data;

  const thisWeek = a?.weeks[a.weeks.length - 1];
  const lastWeek = a?.weeks[a.weeks.length - 2];
  const delta = (k: "active" | "solves" | "completions") => (thisWeek && lastWeek && lastWeek[k] ? (thisWeek[k] - lastWeek[k]) / lastWeek[k] : null);
  const funnelMax = a ? Math.max(1, ...a.funnel.map((f) => f.value)) : 1;

  return (
    <div>
      <PageTitle
        kicker="ANALYTICS"
        title="數據"
        desc={
          <>
            企劃書的 KPI：註冊、活躍、完課、解題、18 校參與。
            {api.mode === "local" ? " 本機模式顯示的是示範數字；接上 API 後由 xp_ledger、lesson_progress、solves、attempts 計算。" : " 由學員的真實紀錄計算，每次載入重新統計。"}
          </>
        }
        actions={
          <button
            type="button"
            onClick={() => setTable((v) => !v)}
            className={cn("flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-[12.5px] font-bold", table ? "border-white/20 bg-white/[0.08]" : "border-white/[0.08] text-fg-2 hover:text-fg")}
          >
            <Table2 size={13} />
            {table ? "圖表" : "表格"}
          </button>
        }
      />

      {!a ? (
        <p className="text-[13px] text-fg-3">{data.error ?? "統計中"}</p>
      ) : (
        <div className="flex flex-col gap-6">
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatTile label="註冊學員" value={a.funnel[0]?.value ?? 0} />
            <StatTile label="本週活躍" value={thisWeek?.active ?? 0} delta={delta("active")} spark={a.weeks.map((w) => w.active)} />
            <StatTile label="本週完課" value={thisWeek?.completions ?? 0} delta={delta("completions")} spark={a.weeks.map((w) => w.completions)} />
            <StatTile label="本週解題" value={thisWeek?.solves ?? 0} delta={delta("solves")} spark={a.weeks.map((w) => w.solves)} />
          </div>

          {table ? (
            <Table>
              <thead>
                <tr>
                  <Th>週（起始日）</Th>
                  <Th className="text-right">活躍學員</Th>
                  <Th className="text-right">完課數</Th>
                  <Th className="text-right">解題數</Th>
                </tr>
              </thead>
              <tbody>
                {a.weeks.map((w) => (
                  <Tr key={w.label}>
                    <Td className="font-mono text-[12.5px]">{w.label}</Td>
                    <Td className="text-right font-mono tabular-nums">{formatNumber(w.active)}</Td>
                    <Td className="text-right font-mono tabular-nums">{formatNumber(w.completions)}</Td>
                    <Td className="text-right font-mono tabular-nums">{formatNumber(w.solves)}</Td>
                  </Tr>
                ))}
              </tbody>
            </Table>
          ) : (
            <div className="grid gap-4 lg:grid-cols-3">
              <Columns title="每週活躍學員" data={a.weeks} field="active" />
              <Columns title="每週完課數" data={a.weeks} field="completions" />
              <Columns title="每週解題數" data={a.weeks} field="solves" />
            </div>
          )}

          <div className="grid gap-6 xl:grid-cols-2">
            <SectionCard title="企劃書 KPI 對照" desc="申請補助時承諾的目標，與現在的實際值。刻度標在 6 個月與 12 個月的門檻上。">
              {GOALS.map((g) => (
                <GoalRow key={g.key} label={g.label} value={a.kpi[g.key]} m6={g.m6} m12={g.m12} unit={g.unit} />
              ))}
            </SectionCard>

            <SectionCard title="學習漏斗" desc="從註冊到解出第一題，每一階留下多少人。">
              <div className="flex flex-col">
                {a.funnel.map((f, i) => {
                  const prev = a.funnel[i - 1];
                  const conv = prev && prev.value ? f.value / prev.value : null;
                  return (
                    <div key={f.label} className="py-2">
                      <div className="flex items-center gap-2">
                        <span className="text-[13px] font-semibold">{f.label}</span>
                        {conv !== null ? <span className="font-mono text-[10.5px] text-fg-3">上一階的 {pct(conv)}</span> : null}
                        <span className="ml-auto font-mono text-[12.5px] font-bold tabular-nums">{formatNumber(f.value)}</span>
                      </div>
                      <div className="mt-1.5 h-[6px] overflow-hidden rounded-r-[3px] bg-white/[0.05]">
                        <div className="h-full rounded-r-[3px]" style={{ width: (f.value / funnelMax) * 100 + "%", background: ACCENT, opacity: 1 - i * 0.2 }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </SectionCard>

            <SectionCard title="各路徑完課率" desc="有進度的學員裡，平均完成了幾成的課。">
              {a.tracks.length === 0 ? <p className="text-[13px] text-fg-3">還沒有已發布的路徑。</p> : null}
              {a.tracks.map((t) => (
                <BarRow
                  key={t.id}
                  dot={t.color}
                  label={t.name}
                  value={pct(t.rate)}
                  ratio={t.rate}
                  sub={formatNumber(t.learners) + " 位學員 · " + t.lessons + " 課"}
                  title={formatNumber(t.completions) + " 次完課"}
                  href={"/admin/tracks/" + t.id}
                />
              ))}
            </SectionCard>

            <SectionCard title="各類別解題率" desc="解出 ÷ 嘗試。低的類別代表題目太難，或缺前置課程。">
              {a.categories.map((c) => (
                <BarRow key={c.category} dot={c.color} label={c.label} value={pct(c.rate)} ratio={c.rate} sub={formatNumber(c.solves) + " 解 / " + formatNumber(c.attempts) + " 次嘗試"} />
              ))}
            </SectionCard>

            <SectionCard
              title="卡關課程"
              desc="開始了卻沒完成的比例最高的課。通常是檢查站太難，或影片太長。"
              right={
                <Link href="/admin/lessons" className="text-[12.5px] text-accent hover:underline">
                  全部課程 →
                </Link>
              }
            >
              {a.dropoff.length === 0 ? <p className="text-[13px] text-fg-3">還沒有課程進度資料。</p> : null}
              {a.dropoff.map((l) => (
                <BarRow key={l.id} label={l.title} value={pct(l.rate)} ratio={l.rate} sub={formatNumber(l.completed) + " / " + formatNumber(l.started) + " 完成"} title={l.track} href={"/admin/lessons/" + l.id} />
              ))}
            </SectionCard>
          </div>

          <SectionCard title="18 校聯防參與" desc="各校的學員數、XP 總和與解題數。前十名。">
            {a.schools.length === 0 ? (
              <p className="text-[13px] text-fg-3">學員還沒填學校。</p>
            ) : (
              <Table className="!rounded-xl">
                <thead>
                  <tr>
                    <Th>#</Th>
                    <Th>學校</Th>
                    <Th className="text-right">學員</Th>
                    <Th className="text-right">XP</Th>
                    <Th className="text-right">解題</Th>
                    <Th>佔比</Th>
                  </tr>
                </thead>
                <tbody>
                  {a.schools.map((s, i) => {
                    const max = Math.max(1, ...a.schools.map((x) => x.xp));
                    return (
                      <Tr key={s.schoolId}>
                        <Td className="font-mono text-[12px] text-fg-3">{i + 1}</Td>
                        <Td className="font-semibold">{s.school}</Td>
                        <Td className="text-right font-mono tabular-nums">{s.members}</Td>
                        <Td className="text-right font-mono tabular-nums text-accent">{formatNumber(s.xp)}</Td>
                        <Td className="text-right font-mono tabular-nums">{s.solves}</Td>
                        <Td className="w-[180px]">
                          <div className="h-[6px] overflow-hidden rounded-r-[3px] bg-white/[0.05]">
                            <div className="h-full rounded-r-[3px]" style={{ width: (s.xp / max) * 100 + "%", background: ACCENT }} />
                          </div>
                        </Td>
                      </Tr>
                    );
                  })}
                </tbody>
              </Table>
            )}
          </SectionCard>
        </div>
      )}
      <ToastHost />
    </div>
  );
}
