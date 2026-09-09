import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  Calendar,
  Droplet,
  GraduationCap,
  Server,
  Star,
  Users,
} from "lucide-react";
import { Icon } from "@/components/ui/icon";
import { DifficultyBadge, HexAvatar } from "@/components/ui/primitives";
import { InstancePanel } from "@/components/challenges/instance-panel";
import { FlagSubmit } from "@/components/challenges/flag-submit";
import { HintsPanel } from "@/components/challenges/hints-panel";
import { QaPanel } from "@/components/community/qa-panel";
import { CATEGORY_META } from "@/data/challenges";
import { allLessons, type Track } from "@/data/tracks";
import { getChallengesPublic, getTracksPublic } from "@/server/repo/content";
import { getInstructorsPublic, getRecentSolvers } from "@/server/repo/site";
import { formatDate, formatNumber } from "@/lib/utils";

export const dynamic = "force-dynamic";

export async function generateMetadata(
  props: PageProps<"/challenges/[slug]">,
): Promise<Metadata> {
  const { slug } = await props.params;
  const c = (await getChallengesPublic()).find((x) => x.slug === slug);
  if (!c) return { title: "找不到這題" };
  return { title: c.name, description: c.blurb };
}

/** Which lesson teaches this challenge, if any. */
function lessonLinkFor(tracks: Track[], slug: string) {
  for (const t of tracks) {
    for (const l of allLessons(t)) {
      if (l.labSlug === slug) {
        return { href: "/learn/" + t.slug + "/" + l.slug, title: l.title, track: t };
      }
    }
  }
  return null;
}

export default async function ChallengePage(props: PageProps<"/challenges/[slug]">) {
  const { slug } = await props.params;
  const [challenges, tracks, instructors] = await Promise.all([getChallengesPublic(), getTracksPublic(), getInstructorsPublic()]);
  const c = challenges.find((x) => x.slug === slug);
  if (!c) notFound();

  const meta = CATEGORY_META[c.category];
  const author = instructors.find((i) => i.id === c.authorId);
  const lesson = lessonLinkFor(tracks, c.slug);
  const solvers = await getRecentSolvers(c.id);

  return (
    <main className="relative">
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-[300px]"
        style={{
          background:
            "radial-gradient(600px 260px at 25% 0%, " + meta.color + "1c, transparent 65%)",
        }}
      />

      <div className="relative mx-auto max-w-7xl px-5 py-10">
        <Link
          href="/challenges"
          className="inline-flex items-center gap-2 text-[12.5px] text-fg-3 transition-colors hover:text-fg"
        >
          <ArrowLeft size={14} />
          回到題庫
        </Link>

        <div className="mt-6 grid gap-8 lg:grid-cols-[1fr_340px]">
          {/* main */}
          <div>
            <div className="flex items-start gap-4">
              <span
                className="clip-hex grid h-14 w-14 shrink-0 place-items-center"
                style={{ background: meta.color + "1f" }}
              >
                <Icon name={meta.icon} size={24} style={{ color: meta.color }} />
              </span>
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2.5">
                  <span
                    className="font-mono text-[11.5px] tracking-[0.18em]"
                    style={{ color: meta.color }}
                  >
                    {meta.en.toUpperCase()}
                  </span>
                  {c.kind === "box" ? (
                    <span className="flex items-center gap-1 rounded border border-purple/40 bg-purple/10 px-1.5 py-px font-mono text-[10px] tracking-wider text-purple">
                      <Server size={9} />
                      BOX
                    </span>
                  ) : null}
                  {c.tutorial ? (
                    <span className="rounded border border-accent/40 bg-accent/10 px-1.5 py-px font-mono text-[10px] tracking-wider text-accent">
                      TUTORIAL
                    </span>
                  ) : null}
                </div>
                <h1 className="mt-1.5 text-[32px] font-extrabold leading-tight tracking-tight sm:text-[38px]">
                  {c.name}
                </h1>
              </div>
            </div>

            <div className="mt-5 flex flex-wrap items-center gap-x-6 gap-y-3 font-mono text-[12px] text-fg-3">
              <DifficultyBadge level={c.difficulty} />
              <span className="flex items-center gap-1.5">
                <Users size={13} />
                {formatNumber(c.solves)} 人解出
              </span>
              <span className="flex items-center gap-1.5">
                <Star size={13} className="text-amber" />
                {c.rating.toFixed(1)}
              </span>
              <span className="flex items-center gap-1.5">
                <Calendar size={13} />
                {formatDate(c.releasedAt)} 上線
              </span>
              <span className="font-bold text-accent">{c.points} 分</span>
            </div>

            <div className="mt-4 flex flex-wrap gap-1.5">
              {c.tags.map((t) => (
                <span
                  key={t}
                  className="rounded-md border border-line bg-bg-3/50 px-2 py-0.5 text-[11.5px] text-fg-2"
                >
                  #{t}
                </span>
              ))}
            </div>

            <div className="card mt-7 p-6">
              <div className="mono-label mb-4">題目敘述</div>
              <div className="prose-scist text-[14.5px] text-fg-2">
                {c.description.map((p, i) => (
                  <p key={i}>{p}</p>
                ))}
              </div>

              {c.tutorial ? (
                <div className="mt-5 rounded-xl border border-accent/30 bg-accent/[0.07] p-4">
                  <div className="mono-label mb-1.5" style={{ color: "var(--color-accent)" }}>
                    你的第一個 FLAG
                  </div>
                  <code className="block break-all font-mono text-[15px] font-bold text-accent">
                    SCIST&#123;w3lc0m3_t0_th3_g4t3&#125;
                  </code>
                  <p className="mt-2 text-[12.5px] text-fg-2">
                    複製它，貼進右邊的提交欄。這就是 CTF 的全部流程。
                  </p>
                </div>
              ) : null}
            </div>

            {lesson ? (
              <Link
                href={lesson.href}
                className="card card-hover mt-4 flex items-center gap-3 p-4"
              >
                <span
                  className="grid h-10 w-10 shrink-0 place-items-center rounded-xl"
                  style={{ background: lesson.track.color + "18", color: lesson.track.color }}
                >
                  <GraduationCap size={18} />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="mono-label mb-0.5">這題對應的課程</div>
                  <div className="truncate text-[14px] font-bold">{lesson.title}</div>
                </div>
                <span className="shrink-0 text-[12.5px] text-fg-3">先看課 →</span>
              </Link>
            ) : null}

            <div className="mt-8">
              <div className="mb-3 flex items-center gap-3">
                <span className="mono-label">討論與發問</span>
                <span className="h-px flex-1 bg-line" />
              </div>
              <div className="card p-5">
                <QaPanel scope="challenge" refId={c.slug} compact />
              </div>
            </div>
          </div>

          {/* sidebar */}
          <aside className="flex flex-col gap-4">
            <FlagSubmit challenge={c} />
            <InstancePanel challenge={c} />
            <HintsPanel challenge={c} />

            {c.firstBlood ? (
              <div className="card p-5">
                <div className="flex items-center gap-2">
                  <Droplet size={15} className="text-red" />
                  <span className="text-[13.5px] font-bold">First Blood</span>
                </div>
                <div className="mt-3 flex items-center gap-3">
                  <HexAvatar seed={c.firstBlood.handle} size={36} />
                  <div>
                    <div className="font-mono text-[13.5px] font-bold">
                      {c.firstBlood.handle}
                    </div>
                    <div className="text-[11.5px] text-fg-3">
                      {c.firstBlood.school} · 上線後 {" "}
                      {Math.max(
                        1,
                        Math.round(
                          (new Date(c.firstBlood.time).getTime() -
                            new Date(c.releasedAt).getTime()) /
                            60000,
                        ),
                      )}{" "}
                      分鐘
                    </div>
                  </div>
                </div>
              </div>
            ) : null}

            <div className="card p-5">
              <div className="mono-label mb-3">最近解出的人</div>
              {solvers.length === 0 ? (
                <p className="text-[12.5px] text-fg-3">還沒有人解出來。第一個就是你，First Blood 等著。</p>
              ) : (
                <div className="flex flex-col gap-2.5">
                  {solvers.map((p) => (
                    <div key={p.id} className="flex items-center gap-2.5">
                      <HexAvatar seed={p.handle} size={26} />
                      <span className="min-w-0 flex-1 truncate font-mono text-[12.5px]">
                        {p.handle}
                      </span>
                      <span className="shrink-0 text-[11px] text-fg-3">
                        {p.schoolShort} · {p.ago}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {author ? (
              <div className="card p-5">
                <div className="mono-label mb-3">出題者</div>
                <div className="flex items-center gap-3">
                  <HexAvatar seed={author.handle} size={36} />
                  <div className="min-w-0">
                    <div className="text-[14px] font-bold">{author.name}</div>
                    <div
                      className="font-mono text-[11.5px]"
                      style={{ color: author.accent }}
                    >
                      @{author.handle}
                    </div>
                  </div>
                </div>
              </div>
            ) : null}
          </aside>
        </div>
      </div>
    </main>
  );
}
