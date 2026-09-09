import { PlayCircle, ListChecks, FlaskConical, Trophy } from "lucide-react";
import { SectionHeading } from "@/components/ui/primitives";

const STEPS = [
  {
    Icon: PlayCircle,
    color: "#4da3ff",
    kicker: "看",
    title: "影音課程",
    body: "講師錄好的課，隨時暫停、倒帶、加速。動態字幕與重點標註，把抽象邏輯變具體。",
  },
  {
    Icon: ListChecks,
    color: "#a4f13b",
    kicker: "檢查",
    title: "知識點檢查站",
    body: "影片播到關鍵處自動暫停跳出小測驗。答對才繼續，確保你是真的懂了才往前。",
  },
  {
    Icon: FlaskConical,
    color: "#3ee8d5",
    kicker: "動手",
    title: "隨堂實戰 Lab",
    body: "每一課配一題真的能打的題目。剛學完 SQL Injection，下一秒就去繞過一個登入表單。",
  },
  {
    Icon: Trophy,
    color: "#ffb84d",
    kicker: "上場",
    title: "題庫與排行榜",
    body: "課程結束不是結束。整座題庫 24 小時開著，跟全台同學一起排名、搶 First Blood。",
  },
];

export function LoopSection() {
  return (
    <section className="divider-glow relative overflow-hidden bg-bg-1/60">
      <div className="dot-grid pointer-events-none absolute inset-0 opacity-30" />
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(800px 400px at 50% 0%, rgba(164,241,59,0.08), transparent 60%)",
        }}
      />
      <div className="relative mx-auto max-w-7xl px-5 py-28">
        <SectionHeading
          align="center"
          label="HOW IT WORKS"
          title="學到哪裡，就做到哪裡"
          desc="傳統線上課的問題是「看完了，然後呢」。我們把每一段影片都綁上一個能動手的東西，讓學習不會停在看懂。"
        />

        <div className="relative mt-16">
          {/* connecting line, desktop only */}
          <svg
            className="pointer-events-none absolute left-0 top-[44px] hidden h-2 w-full lg:block"
            viewBox="0 0 1000 8"
            preserveAspectRatio="none"
            aria-hidden="true"
          >
            <line x1="125" y1="4" x2="875" y2="4" stroke="rgba(255,255,255,0.08)" strokeWidth="2" />
            <line
              x1="125"
              y1="4"
              x2="875"
              y2="4"
              stroke="#a4f13b"
              strokeWidth="2"
              strokeDasharray="10 14"
              className="animate-dash"
              opacity="0.7"
            />
          </svg>

          <div className="grid gap-8 lg:grid-cols-4 lg:gap-6">
            {STEPS.map((s, i) => (
              <div
                key={s.title}
                className="reveal relative flex flex-col items-center text-center"
                style={{ transitionDelay: i * 90 + "ms" }}
              >
                <div className="relative">
                  <span
                    className="absolute inset-0 clip-hex opacity-60 blur-xl"
                    style={{ background: s.color }}
                  />
                  <span
                    className="clip-hex relative grid h-[88px] w-[88px] place-items-center"
                    style={{ background: "linear-gradient(145deg, " + s.color + ", " + s.color + "55)" }}
                  >
                    <span className="clip-hex grid h-[80px] w-[80px] place-items-center bg-bg-1">
                      <s.Icon size={30} style={{ color: s.color }} />
                    </span>
                  </span>
                  <span
                    className="absolute -right-2 -top-2 grid h-7 w-7 place-items-center rounded-full border-2 border-bg-1 font-mono text-[11px] font-bold text-bg-0"
                    style={{ background: s.color }}
                  >
                    {i + 1}
                  </span>
                </div>

                <div className="kicker mt-6" style={{ color: s.color }}>
                  {s.kicker}
                </div>
                <h3 className="display mt-2 text-[22px]">{s.title}</h3>
                <p className="mt-3 max-w-[280px] text-[14.5px] leading-[1.8] text-fg-2">{s.body}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="card border-gradient mt-16 grid gap-8 p-8 lg:grid-cols-[1.4fr_1fr] lg:items-center lg:p-10">
          <div>
            <div className="kicker mb-3">FLYWHEEL · 翻轉教室</div>
            <p className="text-[17px] leading-[1.85] text-fg-2">
              線上把觀念與練習解決掉，
              <span className="font-bold text-fg">每月一次的線下 Bug 診療室</span>
              專門處理「卡住講不清楚」的那種問題。助教不直接給答案，只給下一步。
            </p>
          </div>
          <div className="grid grid-cols-3 gap-4">
            {[
              { v: "24/7", l: "線上自學" },
              { v: "每月", l: "線下解惑" },
              { v: "18 校", l: "在地助教" },
            ].map((s) => (
              <div key={s.l} className="rounded-2xl border border-white/[0.06] bg-bg-0/50 p-4 text-center">
                <div className="font-mono text-[26px] font-bold text-accent">{s.v}</div>
                <div className="mt-1 text-[12px] text-fg-3">{s.l}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
