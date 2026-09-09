import { ArrowRight, Flag } from "lucide-react";
import { LinkButton } from "@/components/ui/primitives";
import { LogoMark } from "@/components/ui/logo";
import { HexField } from "@/components/ui/hex-field";

const ROADMAP = [
  { q: "Q1 籌備", when: "2026 4-6 月", what: "確認補助、簽署講師合約、五大領域大綱定稿" },
  { q: "Q2 製作", when: "2026 6-9 月", what: "錄製影音、編寫講義、CTFd 平台建置" },
  { q: "Q3 測試", when: "2026 9-10 月", what: "18 校助教內測、收集回饋、助教工作坊", now: true },
  { q: "Q4 推廣", when: "2026 10 月起", what: "正式對外開放，月活躍學員 200+" },
];

export function CtaSection() {
  return (
    <section className="relative overflow-hidden">
      <HexField seed={33} lit={14} className="opacity-80" cx="50%" cy="85%" />
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(900px 420px at 50% 115%, rgba(164,241,59,0.22), transparent 62%), linear-gradient(180deg, var(--color-bg-0), transparent 30%)",
        }}
      />

      <div className="relative mx-auto max-w-7xl px-5 py-28">
        <div className="mb-20">
          <div className="kicker mb-8 flex items-center gap-2.5">
            <span className="clip-hex h-2.5 w-2.5 bg-accent" />
            ROADMAP
          </div>
          <div className="relative grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            <div className="pointer-events-none absolute left-0 right-0 top-[5px] hidden h-px bg-white/[0.08] lg:block" />
            {ROADMAP.map((r, i) => (
              <div key={r.q} className="reveal relative pt-6" style={{ transitionDelay: i * 80 + "ms" }}>
                <span
                  className="absolute left-0 top-0 clip-hex h-[11px] w-[11px]"
                  style={{
                    background: r.now ? "var(--color-accent)" : "var(--color-line-2)",
                    boxShadow: r.now ? "0 0 16px rgba(164,241,59,0.9)" : "none",
                  }}
                />
                <div className="font-mono text-[11px] tracking-[0.18em] text-fg-3">{r.when}</div>
                <div className="mt-1.5 flex items-center gap-2 text-[17px] font-extrabold">
                  {r.q}
                  {r.now ? (
                    <span className="rounded-md bg-accent/15 px-1.5 py-px font-mono text-[9.5px] tracking-wider text-accent">
                      NOW
                    </span>
                  ) : null}
                </div>
                <p className="mt-2 text-[13.5px] leading-relaxed text-fg-2">{r.what}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="card border-gradient mx-auto max-w-3xl p-10 text-center sm:p-16">
          <div className="mx-auto mb-7 grid h-16 w-16 place-items-center">
            <span className="absolute h-16 w-16 rounded-full bg-accent/30 blur-xl" />
            <LogoMark size={52} className="relative text-accent" />
          </div>
          <h2 className="display text-balance text-[34px] sm:text-[48px]">
            資訊安全不該只是菁英的專利
          </h2>
          <p className="mx-auto mt-6 max-w-xl text-pretty text-[16.5px] leading-[1.85] text-fg-2">
            台灣每年有數萬名高中生想探索資訊領域，但大多數人在第一道門口就放棄了。
            <span className="text-fg">我們的目標很簡單：讓每一個有好奇心的人，都能找到屬於自己的那道門。</span>
          </p>

          <div className="mt-9 flex flex-wrap justify-center gap-3.5">
            <LinkButton href="/challenges/welcome" size="lg" className="shine">
              解出你的第一題
              <ArrowRight size={18} />
            </LinkButton>
            <LinkButton href="/about" variant="outline" size="lg">
              <Flag size={15} />
              給贊助夥伴的說明
            </LinkButton>
          </div>

          <p className="mt-7 font-mono text-[12px] tracking-widest text-fg-3">
            SCIST · 從南部出發，為全台灣而建
          </p>
        </div>
      </div>
    </section>
  );
}
