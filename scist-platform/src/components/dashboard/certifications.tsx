"use client";

import { Award, Check, Lock } from "lucide-react";
import { ProgressBar } from "@/components/ui/primitives";
import { useCertifications } from "@/components/settings-provider";
import { evaluateCertifications, highestCert, nextCert, type CertStats } from "@/lib/certifications";
import { cn } from "@/lib/utils";

/**
 * 企劃書的三級認證。條件是「完成了哪些課、解了幾題」，跟旁邊那條 XP 階級
 * 進度條是兩套東西，所以標題特別寫清楚差別。
 */
export function Certifications({ stats, trackNameOf }: { stats: CertStats; trackNameOf: (slug: string) => string | undefined }) {
  const rules = useCertifications();
  const statuses = evaluateCertifications(stats, rules, trackNameOf);
  const current = highestCert(statuses);
  const next = nextCert(statuses);

  return (
    <div className="card p-6">
      <div className="mb-1 flex items-center gap-2">
        <Award size={15} className="text-fg-3" />
        <span className="text-[14px] font-bold">學員認證</span>
        {current ? (
          <span
            className="ml-auto rounded-md border px-2 py-0.5 text-[12px] font-semibold"
            style={{ color: current.rule.color, borderColor: current.rule.color + "55", background: current.rule.color + "14" }}
          >
            {current.rule.name}
          </span>
        ) : (
          <span className="ml-auto text-[12px] text-fg-3">還沒取得</span>
        )}
      </div>
      <p className="mb-5 text-[12px] leading-relaxed text-fg-3">
        依完成的課程與題目認定，跟 XP 階級是兩回事。
        {next ? "距離「" + next.rule.name + "」還差 " + next.checks.filter((c) => !c.done).length + " 項。" : "三級全部拿到了。"}
      </p>

      <div className="grid gap-4 md:grid-cols-3">
        {statuses.map((s) => (
          <div
            key={s.rule.id}
            className={cn("rounded-xl border p-4 transition-colors", s.earned ? "bg-white/[0.03]" : "border-line bg-bg-3/30")}
            style={s.earned ? { borderColor: s.rule.color + "55" } : undefined}
          >
            <div className="flex items-center gap-2.5">
              <span
                className="clip-hex grid h-7 w-7 shrink-0 place-items-center"
                style={{ background: s.earned ? s.rule.color + "26" : "rgba(255,255,255,0.05)" }}
              >
                {s.earned ? (
                  <Check size={13} style={{ color: s.rule.color }} />
                ) : (
                  <Lock size={12} className="text-fg-3" />
                )}
              </span>
              <span className="text-[14px] font-bold" style={{ color: s.earned ? s.rule.color : undefined }}>
                {s.rule.name}
              </span>
              <span className="font-mono text-[10.5px] uppercase tracking-wider text-fg-3">{s.rule.en}</span>
              <span className="ml-auto font-mono text-[11px] tabular-nums text-fg-3">
                {s.checks.filter((c) => c.done).length}/{s.checks.length}
              </span>
            </div>

            <p className="mt-2 text-[12.5px] leading-relaxed text-fg-2">{s.rule.blurb}</p>
            <p className="mt-1 text-[11.5px] text-fg-3">對應目標：{s.rule.goal}</p>

            <div className="mt-3">
              <ProgressBar value={s.progress} color={s.rule.color} height={5} />
            </div>

            <ul className="mt-3 flex flex-col gap-1.5">
              {s.checks.map((c) => (
                <li key={c.label} className="flex items-center gap-2 text-[12px]">
                  {c.done ? (
                    <Check size={12} className="shrink-0 text-accent" />
                  ) : (
                    <span className="h-[11px] w-[11px] shrink-0 rounded-full border border-white/20" />
                  )}
                  <span className={c.done ? "text-fg-2 line-through decoration-white/20" : "text-fg-2"}>{c.label}</span>
                  {c.need > 1 ? (
                    <span className="ml-auto shrink-0 font-mono text-[11px] tabular-nums text-fg-3">
                      {Math.min(c.have, c.need)}/{c.need}
                    </span>
                  ) : null}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </div>
  );
}
