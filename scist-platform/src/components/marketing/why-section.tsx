import { AlertTriangle, ArrowRight, Check } from "lucide-react";
import { SectionHeading } from "@/components/ui/primitives";

const PAIRS = [
  {
    problem: "傳承斷層",
    detail: "總召與幹部生命週期只有 2 到 3 年，每屆換人就重來一次。",
    solution: "課程與 SOP 變成永久數位資產",
    gain: "知識不再隨幹部換屆流失",
  },
  {
    problem: "成本高昂",
    detail: "每年重複投入講師費與場地費，錢花掉了但什麼都沒留下。",
    solution: "一次投入，永久複製",
    gain: "年維運成本從 15-30 萬降到 2-3 萬",
  },
  {
    problem: "黏著度下降",
    detail: "傳統綁定一年的模式，下學期流失率顯著上升。",
    solution: "遊戲化 + 每月線下聚會",
    gain: "隨時可以開始，不必等下一期營隊",
  },
];

export function WhySection() {
  return (
    <section className="divider-glow relative bg-bg-1/60">
      <div className="mx-auto max-w-7xl px-5 py-28">
        <SectionHeading
          label="WHY NOW"
          title="六年累積，不該每年砍掉重練"
          desc="SCIST 培育了數百名南部資安人才，在 HITCON、AIS3、技能競賽拿過成績。但組織一直卡在同樣三件事上。"
        />

        <div className="mt-14 flex flex-col gap-4">
          {PAIRS.map((p, i) => (
            <div
              key={p.problem}
              className="card reveal grid gap-6 p-7 md:grid-cols-[1fr_auto_1fr] md:items-center"
              style={{ transitionDelay: i * 80 + "ms" }}
            >
              <div className="flex gap-4">
                <span className="clip-hex grid h-11 w-11 shrink-0 place-items-center bg-red/15">
                  <AlertTriangle size={17} className="text-red" />
                </span>
                <div>
                  <div className="text-[17px] font-extrabold text-red">{p.problem}</div>
                  <p className="mt-1.5 text-[14px] leading-relaxed text-fg-2">{p.detail}</p>
                </div>
              </div>

              <div className="hidden h-12 w-12 place-items-center rounded-full border border-white/10 bg-bg-0 shadow-[0_0_24px_rgba(164,241,59,0.25)] md:grid">
                <ArrowRight size={18} className="text-accent" />
              </div>

              <div className="flex gap-4">
                <span className="clip-hex grid h-11 w-11 shrink-0 place-items-center bg-accent/15">
                  <Check size={17} className="text-accent" strokeWidth={3} />
                </span>
                <div>
                  <div className="text-[17px] font-extrabold text-accent">{p.solution}</div>
                  <p className="mt-1.5 text-[14px] leading-relaxed text-fg-2">{p.gain}</p>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-8 grid gap-4 sm:grid-cols-3">
          {[
            { v: "30 萬", l: "一次性數位化投入" },
            { v: "2-3 萬", l: "之後每年維運成本" },
            { v: "10:1", l: "長期投報比" },
          ].map((s) => (
            <div key={s.l} className="card p-7 text-center">
              <div className="font-mono text-[38px] font-bold leading-none text-accent text-glow">{s.v}</div>
              <div className="mt-3 text-[13px] text-fg-3">{s.l}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
