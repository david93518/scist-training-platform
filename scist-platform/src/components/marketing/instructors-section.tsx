import { Quote } from "lucide-react";
import { SectionHeading, HexAvatar } from "@/components/ui/primitives";
import type { Instructor } from "@/data/instructors";

export function InstructorsSection({ instructors }: { instructors: Instructor[] }) {
  return (
    <section className="mx-auto max-w-7xl px-5 py-28">
      <SectionHeading
        label="INSTRUCTORS"
        title="課是真的有人來上的"
        desc="影片不是唯一。講師每週開直播解題，聊天室可以直接發問；線下的 Bug 診療室也是他們帶。"
      />

      <div className="mt-14 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {instructors.map((ins, i) => (
          <div
            key={ins.id}
            className="card card-hover reveal group relative overflow-hidden"
            style={{ transitionDelay: i * 70 + "ms" }}
          >
            {/* portrait area */}
            <div
              className="relative flex h-[150px] items-end justify-center overflow-hidden"
              style={{
                background:
                  "radial-gradient(260px 160px at 50% 110%, " + ins.accent + "55, transparent 70%), linear-gradient(180deg, " + ins.accent + "12, transparent)",
              }}
            >
              <div className="hex-grid absolute inset-0 opacity-70" />
              <div className="relative -mb-9">
                <span
                  className="absolute inset-0 clip-hex blur-xl opacity-60"
                  style={{ background: ins.accent }}
                />
                <HexAvatar seed={ins.handle} size={88} ring={ins.accent} className="relative" />
              </div>
            </div>

            <div className="px-6 pb-6 pt-12 text-center">
              <div className="display text-[20px]">{ins.name}</div>
              <div className="mt-1 font-mono text-[12px] tracking-wide" style={{ color: ins.accent }}>
                @{ins.handle}
              </div>
              <div className="mt-3 inline-block rounded-full border border-white/[0.08] bg-white/[0.04] px-3 py-1 text-[11.5px] font-semibold text-fg-2">
                {ins.role}
              </div>

              <div className="relative mt-5 text-left">
                <Quote size={16} className="absolute -left-1 -top-2 opacity-30" style={{ color: ins.accent }} />
                <p className="pl-4 text-[13.5px] leading-[1.8] text-fg-2">{ins.bio}</p>
              </div>

              <ul className="mt-5 flex flex-col gap-2 border-t border-white/[0.06] pt-4 text-left">
                {ins.creds.map((c) => (
                  <li key={c} className="flex items-start gap-2.5 text-[12.5px] text-fg-3">
                    <span
                      className="clip-hex mt-1.5 h-2 w-2 shrink-0"
                      style={{ background: ins.accent }}
                    />
                    {c}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        ))}
      </div>

      <p className="mt-8 text-center font-mono text-[11.5px] text-fg-3">
        講師名單由後台「講師」頁維護
      </p>
    </section>
  );
}
