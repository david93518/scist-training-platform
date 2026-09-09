import Link from "next/link";
import { ArrowRight, Terminal } from "lucide-react";
import { SectionHeading, LinkButton } from "@/components/ui/primitives";
import { ChallengeCard } from "@/components/challenges/challenge-card";
import { CATEGORY_META, type Category, type Challenge } from "@/data/challenges";
import { Icon } from "@/components/ui/icon";
import { formatNumber } from "@/lib/utils";

const FEATURED = ["welcome", "sqli-login", "box-anping", "smol-rsa", "ret2win", "hidden-in-plain"];

export function ChallengePreview({ challenges, totalPoints, boxes }: { challenges: Challenge[]; totalPoints: number; boxes: number }) {
  const featured = FEATURED.map((s) => challenges.find((c) => c.slug === s)).filter((c): c is Challenge => Boolean(c));
  const items = featured.length >= 3 ? featured : challenges.slice(0, 6);

  return (
    <section className="mx-auto max-w-7xl px-5 py-28">
      <div className="flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">
        <SectionHeading
          label="THE ARENA"
          title="題庫 24 小時開著"
          desc="每題一個獨立的 Docker 環境，你想什麼時候戳都可以。從送分的教學題到會花掉一整個週末的 heap 題，全部都在。"
        />
        <LinkButton href="/challenges" variant="outline" className="shrink-0">
          進入題庫
          <ArrowRight size={15} />
        </LinkButton>
      </div>

      {/* category strip */}
      <div className="mt-10 flex flex-wrap gap-2.5">
        {(Object.keys(CATEGORY_META) as Category[]).map((c) => {
          const m = CATEGORY_META[c];
          const n = challenges.filter((x) => x.category === c).length;
          return (
            <Link
              key={c}
              href="/challenges"
              className="flex items-center gap-2 rounded-xl border border-white/[0.08] bg-white/[0.03] px-3.5 py-2 text-[13px] font-bold text-fg-2 transition-colors hover:border-white/20 hover:text-fg"
            >
              <Icon name={m.icon} size={14} style={{ color: m.color }} />
              {m.label}
              <span className="font-mono text-[11px] text-fg-3">{n}</span>
            </Link>
          );
        })}
      </div>

      <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((c, i) => (
          <ChallengeCard key={c.id} challenge={c} delay={i * 45} />
        ))}
      </div>

      <div className="card mt-6 flex flex-wrap items-center justify-between gap-6 p-6">
        <div className="flex items-center gap-4">
          <span className="clip-hex grid h-12 w-12 place-items-center bg-accent/15">
            <Terminal size={20} className="text-accent" />
          </span>
          <div>
            <div className="text-[16px] font-extrabold">
              {challenges.length} 題已上線，總分 {formatNumber(totalPoints)}
            </div>
            <div className="text-[13px] text-fg-3">
              Web · Crypto · Reverse · Pwn · Linux · Misc，含 {boxes} 台完整靶機
            </div>
          </div>
        </div>
        <Link
          href="/challenges/welcome"
          className="group inline-flex items-center gap-2 font-mono text-[13px] text-accent"
        >
          第一題直接把 flag 給你
          <ArrowRight size={14} className="transition-transform group-hover:translate-x-1" />
        </Link>
      </div>
    </section>
  );
}
