import Link from "next/link";
import { ArrowRight, MapPin, Users, Calendar } from "lucide-react";
import { SectionHeading, LinkButton } from "@/components/ui/primitives";
import { Icon } from "@/components/ui/icon";
import { EVENT_META, upcomingOf, type SciEvent } from "@/data/events";
import { SCHOOLS, REGIONS } from "@/data/schools";
import { formatDateTime } from "@/lib/utils";

export function CommunitySection({ events: all }: { events: SciEvent[] }) {
  const events = upcomingOf(all);

  return (
    <section className="divider-glow relative bg-bg-1/60">
      <div className="relative mx-auto max-w-7xl px-5 py-28">
        <div className="grid gap-14 lg:grid-cols-[1.1fr_1fr]">
          <div>
            <SectionHeading
              label="COMMUNITY"
              title="卡住的時候，有人接得住你"
              desc="線上解決不了的，就面對面解決。每月的 Bug 診療室你只要帶著卡住的那一題來，助教陪你一步一步走。"
            />

            <div className="mt-10 flex flex-col gap-4">
              {events.map((e, i) => {
                const meta = EVENT_META[e.type];
                return (
                  <Link
                    key={e.id}
                    href="/community"
                    className="card card-hover reveal flex gap-5 p-6"
                    style={{ transitionDelay: i * 70 + "ms" }}
                  >
                    <span
                      className="clip-hex grid h-14 w-14 shrink-0 place-items-center"
                      style={{ background: "linear-gradient(145deg, " + meta.color + "55, " + meta.color + "15)" }}
                    >
                      <Icon name={meta.icon} size={22} style={{ color: meta.color }} />
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-mono text-[10.5px] tracking-[0.18em]" style={{ color: meta.color }}>
                          {meta.label.toUpperCase()}
                        </span>
                        <span className="rounded-md border border-white/[0.08] px-1.5 py-px text-[10.5px] text-fg-3">
                          {e.mode}
                        </span>
                      </div>
                      <h3 className="mt-1.5 text-[17px] font-extrabold">{e.title}</h3>
                      <p className="mt-1.5 line-clamp-2 text-[13.5px] leading-relaxed text-fg-2">
                        {e.summary}
                      </p>
                      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 font-mono text-[11.5px] text-fg-3">
                        <span className="flex items-center gap-1.5">
                          <Calendar size={11} />
                          {formatDateTime(e.startsAt)}
                        </span>
                        <span className="flex items-center gap-1.5">
                          <MapPin size={11} />
                          {e.location}
                        </span>
                        <span className="flex items-center gap-1.5">
                          <Users size={11} />
                          {e.registered}/{e.capacity}
                        </span>
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>

            <LinkButton href="/community" variant="outline" className="mt-6">
              看所有活動與助教計畫
              <ArrowRight size={15} />
            </LinkButton>
          </div>

          <div className="flex flex-col gap-5">
            <div className="card p-7">
              <div className="kicker">18 CAMPUS NETWORK</div>
              <h3 className="display mt-3 text-[24px]">18 校聯防，就是我們的助教網</h3>
              <p className="mt-3 text-[14.5px] leading-[1.8] text-fg-2">
                各校資訊社幹部經過培訓後成為在地助教。他們不直接給答案，而是照著
                「觀念提示 → 方向引導 → 驗證思路」三步驟帶學弟妹。
              </p>

              <div className="mt-6 flex flex-col gap-5">
                {REGIONS.map((region) => {
                  const list = SCHOOLS.filter((s) => s.region === region);
                  return (
                    <div key={region}>
                      <div className="mb-2.5 flex items-center gap-2.5">
                        <span className="clip-hex h-2.5 w-2.5 bg-accent" />
                        <span className="font-mono text-[12px] font-bold tracking-widest text-accent">
                          {region}
                        </span>
                        <span className="h-px flex-1 bg-white/[0.07]" />
                        <span className="font-mono text-[11px] text-fg-3">{list.length} 校</span>
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {list.map((s) => (
                          <span
                            key={s.id}
                            className="rounded-md border border-white/[0.08] bg-white/[0.03] px-2.5 py-1 text-[12px] text-fg-2"
                          >
                            {s.short}
                          </span>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="card border-blue/25 p-7" style={{ background: "linear-gradient(180deg, rgba(77,163,255,0.08), rgba(77,163,255,0.02))" }}>
              <div className="kicker" style={{ color: "#4da3ff" }}>DISCORD</div>
              <h3 className="display mt-3 text-[20px]">問題丟上去，通常十分鐘內有人回</h3>
              <p className="mt-2.5 text-[14px] leading-[1.8] text-fg-2">
                平台的每一課、每一題都能直接發問，問題會同步到 Discord 的對應頻道，助教與講師都在裡面。
              </p>
              <a
                href="https://discord.gg/scist"
                target="_blank"
                rel="noreferrer noopener"
                className="mt-4 inline-flex items-center gap-1.5 font-mono text-[13px] text-blue underline-offset-4 hover:underline"
              >
                discord.gg/scist
                <ArrowRight size={13} />
              </a>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
