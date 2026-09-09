import type { Metadata } from "next";
import { ArrowRight, Check, Mail, Quote, Target } from "lucide-react";
import { SectionHeading, HexAvatar, LinkButton } from "@/components/ui/primitives";
import { PageHero } from "@/components/ui/page-hero";
import { SPONSOR_TIERS, TARGET_SPONSORS } from "@/data/sponsors";
import { SCHOOLS } from "@/data/schools";
import { getInstructorsPublic, getSiteStats } from "@/server/repo/site";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "關於 SCIST",
  description:
    "SCIST 南臺灣學生資訊社群成立六年，致力於彌補南北資訊教育資源落差。這是我們的數位轉型計畫。",
};

const KPI = [
  { label: "平台註冊學員數", base: "0", m6: "500+", m12: "2,000+" },
  { label: "月活躍學員數", base: "0", m6: "200+", m12: "800+" },
  { label: "課程完成率", base: "N/A", m6: "40%+", m12: "60%+" },
  { label: "MyFirstCTF 參賽人數", base: "歷屆累計", m6: "+30%", m12: "+60%" },
  { label: "AIS3 Pre-Exam 前 75 名", base: "歷屆記錄", m6: "10 人+", m12: "20 人+" },
  { label: "合作學校數", base: "18", m6: "25+", m12: "40+" },
];

const BUDGET = [
  { item: "數位課程製作", amount: "100,000", pct: 33, note: "五大領域錄製、基礎程式模組、實作題庫建置" },
  { item: "平台環境建置", amount: "100,000", pct: 33, note: "CTFd 部署、Cloud VPS、網域費用（3 年）" },
  { item: "學習 SOP 製作", amount: "80,000", pct: 27, note: "環境架設手冊、助教指引、學習路徑圖文" },
  { item: "緊急備用金", amount: "20,000", pct: 7, note: "突發狀況處理、額外錄製費用" },
];

export default async function AboutPage() {
  const [instructors, stats] = await Promise.all([getInstructorsPublic(), getSiteStats()]);
  return (
    <main>
      <PageHero
        kicker="ABOUT SCIST"
        title="南部的學生，有同樣的潛力創造世界級的成果"
        desc="SCIST 是由嘉義、台南、高雄、屏東高中生自發組成的學生資訊社群。成立六年，培育了數百名南部資安人才，在 HITCON、AIS3、全國技能競賽中屢獲佳績。"
        seed={23}
        stats={[
          { value: "6 年", label: "深耕資安教育" },
          { value: SCHOOLS.length + " 校", label: "聯防合作網絡" },
          { value: "30 萬", label: "數位化初期預算" },
          { value: "10:1", label: "長期投報比" },
        ]}
      />

      <div className="mx-auto max-w-7xl px-5 py-14">
        {/* vision */}
        <div className="card border-gradient p-10 sm:p-14">
          <Quote size={26} className="text-accent/50" />
          <p className="display mt-5 max-w-3xl text-balance text-[24px] leading-[1.5] sm:text-[30px]">
            成為台灣高中生學習資安的第一道門。用平易近人的方式，帶領每個人踏入資安這項領域，無論起點在哪裡。
          </p>
          <p className="mt-5 font-mono text-[12px] tracking-widest text-fg-3">SCIST 核心願景</p>
        </div>

        {/* what we built */}
        <div className="mt-24">
          <SectionHeading
            label="THE PLATFORM"
            title="這個平台實際上是什麼"
            desc="不是一堆影片丟在雲端硬碟。是一套把「看懂」和「做得出來」綁在一起的系統。"
          />
          <div className="mt-10 grid gap-5 sm:grid-cols-3">
            {[
              { t: "影音教學系統", v: stats.lessons + " 個單元", items: ["五大資安領域完整課程", "基礎程式設計模組（C++ 與 Python）", "動態字幕、視覺重點標註", "學習進度追蹤與完成率"] },
              { t: "自動化評測系統", v: stats.challenges + " 題上線", items: ["基於開源 CTFd 部署", "Docker 容器化題目環境", "24 小時不間斷練習", "後台追蹤解題率與卡關點"] },
              { t: "社群互動模組", v: "每月一次聚會", items: ["Discord 整合，無縫銜接", "18 校幹部轉化為在地助教", "學習積分與排行榜", "Bug 診療室線下預約"] },
            ].map((c) => (
              <div key={c.t} className="card p-7">
                <div className="kicker mb-3">{c.v}</div>
                <h3 className="display text-[22px]">{c.t}</h3>
                <ul className="mt-5 flex flex-col gap-2.5">
                  {c.items.map((i) => (
                    <li key={i} className="flex items-start gap-2.5 text-[14px] text-fg-2">
                      <Check size={14} className="mt-1 shrink-0 text-accent" strokeWidth={3} />
                      {i}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>

        {/* instructors */}
        <div className="mt-24">
          <SectionHeading label="INSTRUCTORS" title="講師陣容" />
          <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {instructors.map((ins) => (
              <div key={ins.id} className="card p-6">
                <HexAvatar seed={ins.handle} size={52} ring={ins.accent} />
                <div className="display mt-4 text-[18px]">{ins.name}</div>
                <div className="font-mono text-[12px]" style={{ color: ins.accent }}>@{ins.handle}</div>
                <div className="mono-label mt-3">{ins.role}</div>
                <p className="mt-3 text-[13.5px] leading-[1.8] text-fg-2">{ins.bio}</p>
              </div>
            ))}
          </div>
          <p className="mt-5 font-mono text-[11.5px] text-fg-3">講師名單由後台「講師」頁維護。</p>
        </div>

        {/* budget + KPI */}
        <div className="mt-24 grid gap-10 lg:grid-cols-2">
          <div>
            <SectionHeading label="BUDGET" title="30 萬花在哪裡" desc="壓低平台成本，聚焦內容品質。平台用成熟開源方案，錢留給真正會累積的東西。" />
            <div className="mt-9 flex flex-col gap-4">
              {BUDGET.map((b) => (
                <div key={b.item} className="card p-6">
                  <div className="flex items-baseline justify-between gap-3">
                    <span className="text-[16px] font-extrabold">{b.item}</span>
                    <span className="font-mono text-[15px] text-accent">{b.amount}</span>
                  </div>
                  <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/[0.07]">
                    <div className="h-full rounded-full bg-accent shadow-[0_0_12px_rgba(164,241,59,0.8)]" style={{ width: b.pct + "%" }} />
                  </div>
                  <p className="mt-2.5 text-[13px] text-fg-3">{b.note}</p>
                </div>
              ))}
            </div>
          </div>

          <div>
            <SectionHeading label="KPI" title="怎麼證明有效" desc="每一項都有基準值與時間點。做不到就是做不到，我們自己看得見。" />
            <div className="card mt-9 overflow-hidden">
              <div className="grid grid-cols-[1.4fr_repeat(3,0.6fr)] gap-2 border-b border-white/[0.06] bg-white/[0.03] px-5 py-3">
                <span className="mono-label">指標</span>
                <span className="mono-label text-right">基準</span>
                <span className="mono-label text-right">6 個月</span>
                <span className="mono-label text-right">12 個月</span>
              </div>
              {KPI.map((k) => (
                <div key={k.label} className="grid grid-cols-[1.4fr_repeat(3,0.6fr)] items-center gap-2 border-b border-white/[0.06] px-5 py-3.5 last:border-b-0">
                  <span className="text-[13.5px] text-fg-2">{k.label}</span>
                  <span className="text-right font-mono text-[12px] text-fg-3">{k.base}</span>
                  <span className="text-right font-mono text-[12.5px] text-fg-2">{k.m6}</span>
                  <span className="text-right font-mono text-[13px] font-bold text-accent">{k.m12}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* sponsors */}
        <div className="mt-24">
          <SectionHeading label="SPONSORSHIP" title="給企業夥伴" desc="三級贊助方案，讓企業以最適合自身目標的方式支持台灣資安教育。" />
          <div className="mt-10 grid gap-5 lg:grid-cols-3">
            {SPONSOR_TIERS.map((t) => (
              <div key={t.id} className="card relative overflow-hidden p-7" style={{ borderColor: t.color + "40" }}>
                <div className="absolute inset-x-0 top-0 h-1" style={{ background: "linear-gradient(90deg, " + t.color + ", transparent)" }} />
                <div className="display text-[22px]" style={{ color: t.color }}>{t.name}</div>
                <div className="mt-1 font-mono text-[13px] text-fg-3">{t.min}</div>
                <ul className="mt-6 flex flex-col gap-3">
                  {t.perks.map((p) => (
                    <li key={p} className="flex items-start gap-2.5 text-[14px] text-fg-2">
                      <Check size={14} className="mt-1 shrink-0" strokeWidth={3} style={{ color: t.color }} />
                      {p}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
          <div className="card mt-5 p-6">
            <div className="mono-label mb-3">目標合作夥伴</div>
            <div className="flex flex-wrap gap-2.5">
              {TARGET_SPONSORS.map((s) => (
                <span key={s} className="rounded-lg border border-white/[0.08] bg-white/[0.03] px-3.5 py-2 text-[13.5px] font-semibold text-fg-2">{s}</span>
              ))}
            </div>
          </div>
        </div>

        {/* closing */}
        <div className="mt-24 grid gap-10 lg:grid-cols-[1.3fr_1fr] lg:items-center">
          <div>
            <span className="clip-hex grid h-12 w-12 place-items-center bg-accent/15">
              <Target size={22} className="text-accent" />
            </span>
            <h2 className="display mt-6 text-balance text-[34px] sm:text-[44px]">數位轉型不是拋棄過去</h2>
            <p className="mt-5 text-pretty text-[16.5px] leading-[1.85] text-fg-2">
              而是讓過去六年積累的智慧，能夠服務更多人、走得更遠。一次 30 萬的投入，換來的是可以永久服務全台學員的數位資產，是再也不會因幹部換屆而消失的知識體系。
              <span className="text-fg">讓台灣資安下一個十年的人才養成，從南部開始紮根。</span>
            </p>
            <div className="mt-8 flex flex-wrap gap-3.5">
              <LinkButton href="/learn">看看課程長什麼樣<ArrowRight size={15} /></LinkButton>
              <LinkButton href="/challenges" variant="outline">去題庫戳戳看</LinkButton>
            </div>
          </div>

          <div className="card p-7">
            <div className="flex items-center gap-2.5">
              <Mail size={16} className="text-fg-3" />
              <span className="text-[15px] font-extrabold">合作洽詢</span>
            </div>
            <div className="mt-5 flex flex-col gap-3">
              {[
                { l: "官方網站", v: "scist.org", href: "https://scist.org" },
                { l: "Discord", v: "discord.gg/scist", href: "https://discord.gg/scist" },
                { l: "Instagram", v: "@scist.tw", href: "https://instagram.com/scist.tw" },
                { l: "YouTube", v: "Official SCIST", href: "https://youtube.com" },
              ].map((c) => (
                <a key={c.l} href={c.href} target="_blank" rel="noreferrer noopener" className="flex items-center justify-between rounded-xl border border-white/[0.08] bg-white/[0.03] px-4 py-3.5 transition-colors hover:border-accent/40">
                  <span className="text-[13.5px] text-fg-3">{c.l}</span>
                  <span className="font-mono text-[13.5px] text-fg-2">{c.v}</span>
                </a>
              ))}
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
