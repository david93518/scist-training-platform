import type { Metadata } from "next";
import { ArrowRight, MessageSquare, ShieldCheck, Users2 } from "lucide-react";
import { SectionHeading, HexAvatar } from "@/components/ui/primitives";
import { PageHero } from "@/components/ui/page-hero";
import { EventList } from "@/components/events/event-list";
import { SCHOOLS, REGIONS, schoolById } from "@/data/schools";
import { getEventsPublic } from "@/server/repo/content";
import { getInstructorsPublic, getPlayersPublic, getSiteStats } from "@/server/repo/site";
import { getSettings } from "@/server/repo/settings";
import { formatNumber } from "@/lib/utils";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "社群",
  description:
    "Bug 診療室、講師直播、助教賦能計畫、SCIST 盃。線上自學搭配線下解惑的翻轉教室。",
};

const SOP = [
  { step: "01", title: "觀念提示", body: "先確認學員的觀念哪一塊沒接上，用問題把它問出來，不要直接說答案。" },
  { step: "02", title: "方向引導", body: "指出下一步該往哪看，例如「你有看過那個 request 的回應標頭嗎」。" },
  { step: "03", title: "驗證思路", body: "讓學員自己說一遍推理過程。說得通，這一題才算真的是他解的。" },
];

export default async function CommunityPage() {
  const settings = await getSettings();
  const [events, instructors, players, stats] = await Promise.all([
    getEventsPublic(),
    getInstructorsPublic(),
    getPlayersPublic(settings.leaderboard.weekStartsOn),
    getSiteStats(),
  ]);
  const assistants = players.filter((p) => p.isAssistant);
  const discord = settings.site.discordInvite || "https://discord.gg/scist";

  return (
    <main>
      <PageHero
        kicker="COMMUNITY"
        title="線上學不會的，我們面對面解決"
        desc="翻轉教室的意思是：知識傳遞放到線上，寶貴的相處時間拿來處理真正的卡點。每個月一次 Bug 診療室，每週一次講師直播，你不會一個人卡在那裡。"
        seed={19}
        stats={[
          { value: formatNumber(stats.users), label: "註冊學員" },
          { value: formatNumber(stats.monthlyActive), label: "月活躍" },
          { value: SCHOOLS.length, label: "聯防學校" },
          { value: assistants.length, label: "在地助教" },
        ]}
      />

      <div className="mx-auto max-w-7xl px-5 py-14">
        <div className="mb-6 flex items-center gap-3">
          <span className="kicker">近期活動</span>
          <span className="h-px flex-1 bg-white/[0.07]" />
        </div>
        <EventList events={events} instructors={instructors} />

        <div className="mt-24 grid gap-8 lg:grid-cols-[1.2fr_1fr]">
          <div>
            <SectionHeading
              label="ASSISTANT PROGRAM"
              title="助教賦能計畫"
              desc="18 所合作高中的資訊社幹部，是 SCIST 最寶貴的人力資源。經過培訓後，他們就是離學弟妹最近的那個人。"
            />

            <div className="mt-9 flex flex-col gap-4">
              {SOP.map((s) => (
                <div key={s.step} className="card flex gap-5 p-6">
                  <span className="font-mono text-[28px] font-bold leading-none text-accent/40">{s.step}</span>
                  <div>
                    <h3 className="text-[17px] font-extrabold">{s.title}</h3>
                    <p className="mt-2 text-[14.5px] leading-[1.8] text-fg-2">{s.body}</p>
                  </div>
                </div>
              ))}
            </div>

            <div className="card mt-4 border-blue/25 p-6" style={{ background: "linear-gradient(180deg, rgba(77,163,255,0.08), rgba(77,163,255,0.02))" }}>
              <div className="flex items-center gap-2.5">
                <ShieldCheck size={16} className="text-blue" />
                <span className="text-[15px] font-extrabold">助教激勵機制</span>
              </div>
              <p className="mt-2.5 text-[14.5px] leading-[1.8] text-fg-2">
                累積助教時數可兌換資深課程的優先報名資格。帶人本身就是最好的學習，至少培育 3 位能獨立帶工作坊的在地講師是我們的年度目標。
              </p>
            </div>
          </div>

          <div className="flex flex-col gap-5">
            <div className="card p-6">
              <div className="mb-5 flex items-center gap-2.5">
                <Users2 size={16} className="text-fg-3" />
                <span className="text-[15px] font-extrabold">現任助教</span>
              </div>
              {assistants.length === 0 ? <p className="text-[13px] text-fg-3">還沒有助教。到後台「學員與角色」把幹部設為助教。</p> : null}
              <div className="flex flex-col gap-3.5">
                {assistants.map((p) => (
                  <div key={p.id} className="flex items-center gap-3">
                    <HexAvatar seed={p.handle} hue={p.hue} size={38} />
                    <div className="min-w-0 flex-1">
                      <div className="font-mono text-[13.5px] font-bold">{p.handle}</div>
                      <div className="text-[12px] text-fg-3">
                        {schoolById(p.schoolId)?.short}
                        {p.title ? " · " + p.title : ""}
                      </div>
                    </div>
                    <span className="font-mono text-[12px] text-accent">{formatNumber(p.xp)}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="card p-6">
              <div className="mb-5 flex items-center gap-2.5">
                <MessageSquare size={16} className="text-fg-3" />
                <span className="text-[15px] font-extrabold">講師群</span>
              </div>
              <div className="flex flex-col gap-3.5">
                {instructors.map((ins) => (
                  <div key={ins.id} className="flex items-center gap-3">
                    <HexAvatar seed={ins.handle} size={38} ring={ins.accent} />
                    <div className="min-w-0 flex-1">
                      <div className="text-[13.5px] font-bold">{ins.name}</div>
                      <div className="text-[12px] text-fg-3">{ins.role}</div>
                    </div>
                    <span className="font-mono text-[12px]" style={{ color: ins.accent }}>
                      @{ins.handle}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <a
              href={discord}
              target="_blank"
              rel="noreferrer noopener"
              className="card card-hover border-blue/25 p-6"
              style={{ background: "linear-gradient(180deg, rgba(77,163,255,0.08), rgba(77,163,255,0.02))" }}
            >
              <div className="kicker" style={{ color: "#4da3ff" }}>DISCORD</div>
              <h3 className="display mt-3 text-[20px]">加入社群，問題不會沒人理</h3>
              <p className="mt-2.5 text-[14px] leading-[1.8] text-fg-2">
                平台上每一課、每一題的發問都會同步到對應頻道。助教平均十分鐘內回覆。
              </p>
              <span className="mt-4 inline-flex items-center gap-1.5 font-mono text-[13px] text-blue">
                {discord.replace(/^https?:\/\//, "")}
                <ArrowRight size={13} />
              </span>
            </a>
          </div>
        </div>

        <div className="mt-24">
          <SectionHeading
            label="18 CAMPUS NETWORK"
            title="18 校聯防網絡"
            desc="嘉義、台南、高雄、屏東。從南部四個縣市長出來的學生社群，現在要服務全台灣。"
          />
          <div className="mt-9 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {REGIONS.map((region) => {
              const list = SCHOOLS.filter((s) => s.region === region);
              return (
                <div key={region} className="card p-6">
                  <div className="flex items-baseline justify-between">
                    <span className="display text-[22px] text-accent">{region}</span>
                    <span className="font-mono text-[12px] text-fg-3">{list.length} 校</span>
                  </div>
                  <div className="mt-4 flex flex-col gap-2.5 border-t border-white/[0.06] pt-4">
                    {list.map((s) => (
                      <div key={s.id}>
                        <div className="text-[14px] font-bold text-fg-2">{s.short}</div>
                        <div className="text-[11.5px] text-fg-3">{s.name}</div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </main>
  );
}
