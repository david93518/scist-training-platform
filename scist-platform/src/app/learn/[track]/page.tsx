import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ArrowRight, Clock, FlaskConical, ListChecks, Target, Zap } from "lucide-react";
import { Icon } from "@/components/ui/icon";
import { DifficultyBadge, LinkButton, HexAvatar, SectionLabel } from "@/components/ui/primitives";
import { HexField } from "@/components/ui/hex-field";
import { TrackProgressPill } from "@/components/learn/track-progress-pill";
import { LessonRow } from "@/components/learn/lesson-row";
import { trackLessonCount, trackTotalSeconds, trackTotalXp } from "@/data/tracks";
import { getChallengesPublic, getTracksPublic } from "@/server/repo/content";
import { getInstructorsPublic } from "@/server/repo/site";
import { formatNumber } from "@/lib/utils";

export const dynamic = "force-dynamic";

export async function generateMetadata(props: PageProps<"/learn/[track]">): Promise<Metadata> {
  const { track: slug } = await props.params;
  const track = (await getTracksPublic()).find((t) => t.slug === slug);
  if (!track) return { title: "找不到課程" };
  return { title: track.name + " " + track.en, description: track.tagline + " 課程大綱：" + track.syllabus.join("、") };
}

export default async function TrackPage(props: PageProps<"/learn/[track]">) {
  const { track: slug } = await props.params;
  const [tracks, challenges, instructors] = await Promise.all([getTracksPublic(), getChallengesPublic(), getInstructorsPublic()]);
  const track = tracks.find((t) => t.slug === slug);
  if (!track) notFound();

  const ins = instructors.find((i) => i.id === track.instructorId);
  const first = track.modules[0]?.lessons[0];
  const labFor = (labSlug?: string) => (labSlug ? challenges.find((c) => c.slug === labSlug) : undefined);
  const labs = track.modules
    .flatMap((m) => m.lessons)
    .map((l) => labFor(l.labSlug))
    .filter((c): c is NonNullable<typeof c> => Boolean(c));

  return (
    <main>
      <section className="relative overflow-hidden border-b border-white/[0.06]">
        <HexField seed={track.id.length * 7 + 2} lit={9} color={track.color} className="opacity-80" cx="70%" cy="0%" />
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              "radial-gradient(900px 380px at 18% -10%, " + track.color + "2a, transparent 60%), linear-gradient(180deg, transparent 40%, var(--color-bg-0))",
          }}
        />
        <div className="relative mx-auto max-w-7xl px-5 pb-14 pt-12 sm:pt-16">
          <Link href="/learn" className="inline-flex items-center gap-2 text-[13px] text-fg-3 transition-colors hover:text-fg">
            <ArrowLeft size={14} />
            所有學習路徑
          </Link>

          <div className="mt-8 flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">
            <div className="flex items-start gap-6">
              <span
                className="clip-hex grid h-[96px] w-[96px] shrink-0 place-items-center"
                style={{ background: "linear-gradient(145deg, " + track.color + ", " + track.color + "66)" }}
              >
                <span className="clip-hex grid h-[86px] w-[86px] place-items-center bg-bg-1">
                  <Icon name={track.icon} size={38} style={{ color: track.color }} />
                </span>
              </span>
              <div className="min-w-0">
                <SectionLabel>{track.en.toUpperCase()}</SectionLabel>
                <h1 className="display mt-3 text-[42px] sm:text-[56px]">{track.name}</h1>
                <p className="mt-4 max-w-2xl text-pretty text-[16.5px] leading-[1.8] text-fg-2">{track.tagline}</p>
                <div className="mt-5 flex flex-wrap items-center gap-x-6 gap-y-3 font-mono text-[12.5px] text-fg-3">
                  <DifficultyBadge level={track.difficulty} />
                  <span className="flex items-center gap-1.5"><ListChecks size={13} />{trackLessonCount(track)} 課</span>
                  <span className="flex items-center gap-1.5"><Clock size={13} />{Math.round(trackTotalSeconds(track) / 60)} 分鐘</span>
                  <span className="flex items-center gap-1.5 text-accent"><Zap size={13} />+{formatNumber(trackTotalXp(track))} XP</span>
                  <span className="flex items-center gap-1.5"><FlaskConical size={13} />{labs.length} 個實戰 Lab</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-7xl px-5 py-12">
        <div className="grid gap-8 lg:grid-cols-[1fr_340px]">
          <div className="flex flex-col gap-8">
            {track.modules.map((mod) => (
              <div key={mod.title}>
                <div className="mb-4 flex items-center gap-3">
                  <span className="kicker">{mod.title}</span>
                  <span className="h-px flex-1 bg-white/[0.07]" />
                </div>
                <div className="card divide-y divide-white/[0.06] overflow-hidden">
                  {mod.lessons.length === 0 ? <p className="p-5 text-[13px] text-fg-3">這一章還沒有已發布的課。</p> : null}
                  {mod.lessons.map((l, i) => (
                    <LessonRow key={l.id} track={track} lesson={l} index={i} lab={labFor(l.labSlug)} />
                  ))}
                </div>
              </div>
            ))}
          </div>

          <aside className="flex flex-col gap-5">
            <div className="card flex flex-col gap-5 p-6">
              {/* the pill renders nothing for visitors, so the button then leads the card */}
              <TrackProgressPill track={track} />
              {first ? (
                <LinkButton href={"/learn/" + track.slug + "/" + first.slug} className="w-full shine">
                  開始上課
                  <ArrowRight size={15} />
                </LinkButton>
              ) : null}
              <div className="flex items-start gap-3 border-t border-white/[0.06] pt-5">
                <span className="clip-hex grid h-9 w-9 shrink-0 place-items-center bg-accent/15">
                  <Target size={15} className="text-accent" />
                </span>
                <div>
                  <div className="mono-label mb-1">目標成果</div>
                  <p className="text-[14px] leading-relaxed text-fg-2">{track.outcome}</p>
                </div>
              </div>
            </div>

            {ins ? (
              <div className="card p-6">
                <div className="mono-label mb-4">你的講師</div>
                <div className="flex items-center gap-3.5">
                  <HexAvatar seed={ins.handle} size={50} ring={ins.accent} />
                  <div className="min-w-0">
                    <div className="text-[16px] font-extrabold">{ins.name}</div>
                    <div className="font-mono text-[12px]" style={{ color: ins.accent }}>@{ins.handle}</div>
                  </div>
                </div>
                <p className="mt-4 text-[13.5px] leading-[1.8] text-fg-2">{ins.bio}</p>
                <ul className="mt-4 flex flex-col gap-2 border-t border-white/[0.06] pt-4">
                  {ins.creds.map((c) => (
                    <li key={c} className="flex items-start gap-2.5 text-[12.5px] text-fg-3">
                      <span className="clip-hex mt-1.5 h-2 w-2 shrink-0" style={{ background: ins.accent }} />
                      {c}
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}

            {labs.length > 0 ? (
              <div className="card p-6">
                <div className="mono-label mb-4">這條路上的實戰題</div>
                <div className="flex flex-col gap-2.5">
                  {labs.map((c) => (
                    <Link key={c.id} href={"/challenges/" + c.slug} className="flex items-center justify-between gap-3 rounded-xl border border-white/[0.08] bg-white/[0.03] px-3.5 py-3 transition-colors hover:border-accent/40">
                      <span className="min-w-0">
                        <span className="block truncate text-[14px] font-bold">{c.name}</span>
                        <span className="font-mono text-[11px] text-fg-3">{c.points} pts</span>
                      </span>
                      <DifficultyBadge level={c.difficulty} />
                    </Link>
                  ))}
                </div>
              </div>
            ) : null}
          </aside>
        </div>
      </div>
    </main>
  );
}
