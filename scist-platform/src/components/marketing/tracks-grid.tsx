import Link from "next/link";
import { ArrowUpRight, Clock, ListChecks, Zap } from "lucide-react";
import { Icon } from "@/components/ui/icon";
import { SectionHeading, DifficultyBadge } from "@/components/ui/primitives";
import { trackLessonCount, trackTotalSeconds, trackTotalXp, type Track } from "@/data/tracks";
import { formatNumber } from "@/lib/utils";

const STAGES = ["入門", "實戰", "競賽"];

export function TracksGrid({ tracks }: { tracks: Track[] }) {
  return (
    <section className="relative mx-auto max-w-7xl px-5 py-28" id="tracks">
      <div className="flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">
        <SectionHeading
          label="LEARNING PATHS"
          title={
            <>
              五大資安領域，
              <br className="hidden sm:block" />
              一條走得完的路
            </>
          }
          desc="每個領域都採「入門 → 實戰 → 競賽」三階段設計。零基礎進來，先學觀念，馬上動手，最後打比賽。"
        />
        <Link
          href="/learn"
          className="group inline-flex items-center gap-2 font-mono text-[13px] text-accent"
        >
          看全部課程
          <ArrowUpRight size={15} className="transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
        </Link>
      </div>

      <div className="mt-14 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {tracks.map((t, i) => {
          const lessons = trackLessonCount(t);
          const mins = Math.round(trackTotalSeconds(t) / 60);
          return (
            <Link
              key={t.id}
              href={"/learn/" + t.slug}
              className="card card-hover reveal group relative flex flex-col overflow-hidden"
              style={{ transitionDelay: i * 50 + "ms" }}
            >
              {/* color band */}
              <div
                className="relative h-[118px] overflow-hidden"
                style={{
                  background:
                    "linear-gradient(135deg, " + t.color + "3a 0%, " + t.color + "10 55%, transparent 100%)",
                }}
              >
                <div className="hex-grid absolute inset-0 opacity-60" />
                <Icon
                  name={t.icon}
                  size={150}
                  className="absolute -right-6 -top-6 opacity-[0.12] transition-transform duration-500 group-hover:rotate-6 group-hover:scale-110"
                  style={{ color: t.color }}
                />
                <div className="absolute left-6 top-5 font-mono text-[11px] tracking-[0.2em]" style={{ color: t.color }}>
                  {t.en.toUpperCase()}
                </div>
                <div className="absolute right-5 top-5 rounded-md border border-white/10 bg-bg-0/60 px-2 py-0.5 text-[11px] text-fg-2 backdrop-blur">
                  {t.level}
                </div>
              </div>

              {/* hex icon overlapping the band edge */}
              <div className="relative -mt-9 px-6">
                <span
                  className="clip-hex grid h-[72px] w-[72px] place-items-center"
                  style={{ background: "linear-gradient(145deg, " + t.color + ", " + t.color + "66)" }}
                >
                  <span className="clip-hex grid h-[64px] w-[64px] place-items-center bg-bg-1">
                    <Icon name={t.icon} size={26} style={{ color: t.color }} />
                  </span>
                </span>
              </div>

              <div className="flex flex-1 flex-col px-6 pb-6 pt-4">
                <h3 className="display text-[24px]">{t.name}</h3>
                <p className="mt-2 min-h-[48px] text-[14.5px] leading-relaxed text-fg-2">
                  {t.tagline}
                </p>

                {/* 3-stage stepper */}
                <div className="mt-5 flex items-center">
                  {STAGES.map((s, k) => (
                    <div key={s} className="flex flex-1 items-center last:flex-none">
                      <div className="flex flex-col items-center gap-1.5">
                        <span
                          className="clip-hex grid h-5 w-5 place-items-center"
                          style={{
                            background: k === 0 ? t.color : "rgba(255,255,255,0.08)",
                            boxShadow: k === 0 ? "0 0 12px " + t.color + "99" : "none",
                          }}
                        >
                          <span className="font-mono text-[9px] font-bold" style={{ color: k === 0 ? "#06090e" : "#6b7a8e" }}>
                            {k + 1}
                          </span>
                        </span>
                        <span className="text-[11px] font-semibold text-fg-2">{s}</span>
                      </div>
                      {k < STAGES.length - 1 ? (
                        <span
                          className="mx-2 mb-5 h-px flex-1"
                          style={{
                            background:
                              k === 0
                                ? "linear-gradient(90deg, " + t.color + ", rgba(255,255,255,0.1))"
                                : "rgba(255,255,255,0.1)",
                          }}
                        />
                      ) : null}
                    </div>
                  ))}
                </div>

                <div className="mt-5 flex flex-wrap gap-1.5">
                  {t.syllabus.slice(0, 4).map((s) => (
                    <span
                      key={s}
                      className="rounded-md border border-white/[0.08] bg-white/[0.03] px-2 py-1 text-[11.5px] text-fg-2"
                    >
                      {s}
                    </span>
                  ))}
                </div>

                <div className="mt-auto flex items-center justify-between border-t border-white/[0.06] pt-4 [margin-top:20px]">
                  <DifficultyBadge level={t.difficulty} />
                  <div className="flex items-center gap-3.5 font-mono text-[11.5px] text-fg-3">
                    <span className="flex items-center gap-1">
                      <ListChecks size={12} />
                      {lessons}
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock size={12} />
                      {mins}m
                    </span>
                    <span className="flex items-center gap-1 text-accent">
                      <Zap size={12} />
                      {formatNumber(trackTotalXp(t))}
                    </span>
                  </div>
                </div>
              </div>

              <div
                className="absolute inset-x-0 bottom-0 h-[3px] origin-left scale-x-0 transition-transform duration-500 group-hover:scale-x-100"
                style={{ background: "linear-gradient(90deg, " + t.color + ", transparent)" }}
              />
            </Link>
          );
        })}
      </div>
    </section>
  );
}
