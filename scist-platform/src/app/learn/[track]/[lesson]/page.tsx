import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { LessonPlayer } from "@/components/learn/lesson-player";
import { CurriculumSidebar } from "@/components/learn/curriculum-sidebar";
import type { LessonVideo } from "@/components/learn/video-stage";
import { lessonBySlug } from "@/data/tracks";
import { getTracksPublic, getChallengesPublic, getLessonVideo } from "@/server/repo/content";
import { playbackUrl } from "@/server/services/stream";
import { getCurrentUser } from "@/server/auth";
import { revealedCheckpoints } from "@/server/repo/learner";

export const dynamic = "force-dynamic";

async function load(trackSlug: string, lessonSlug: string) {
  const tracks = await getTracksPublic();
  const track = tracks.find((t) => t.slug === trackSlug);
  const lesson = track ? lessonBySlug(track, lessonSlug) : undefined;
  return { track, lesson };
}

export async function generateMetadata(
  props: PageProps<"/learn/[track]/[lesson]">,
): Promise<Metadata> {
  const { track: trackSlug, lesson: lessonSlug } = await props.params;
  const { track, lesson } = await load(trackSlug, lessonSlug);
  if (!track || !lesson) return { title: "找不到這一課" };
  return { title: lesson.title, description: lesson.summary };
}

export default async function LessonPage(
  props: PageProps<"/learn/[track]/[lesson]">,
) {
  const { track: trackSlug, lesson: lessonSlug } = await props.params;
  const { track, lesson } = await load(trackSlug, lessonSlug);
  if (!track) notFound();
  if (!lesson) notFound();

  const user = await getCurrentUser();
  const [lab, source, revealed] = await Promise.all([
    lesson.labSlug ? getChallengesPublic().then((all) => all.find((c) => c.slug === lesson.labSlug)) : Promise.resolve(undefined),
    getLessonVideo(lesson.id),
    // checkpoints this learner already passed come back with their answer and
    // explanation so revisiting a finished lesson is still useful
    user ? revealedCheckpoints(user.id, trackSlug, lessonSlug).catch(() => ({})) : Promise.resolve({}),
  ]);

  // a Stream upload that is still processing plays the stand-in until it is ready
  const video: LessonVideo =
    source && source.videoProvider === "youtube" && source.videoId
      ? { provider: "youtube", videoId: source.videoId, url: null }
      : source && source.videoProvider === "stream" && source.videoId && source.videoStatus === "ready"
        ? { provider: "stream", videoId: source.videoId, url: playbackUrl(source.videoId) }
        : { provider: "none", videoId: null, url: null };

  return (
    <main className="mx-auto max-w-[1600px] px-5 py-8">
      <div className="grid gap-6 lg:grid-cols-[280px_1fr]">
        <div className="min-w-0 lg:sticky lg:top-20 lg:self-start">
          <CurriculumSidebar track={track} currentSlug={lesson.slug} />
        </div>
        {/* keyed so switching lessons remounts with fresh playback state */}
        <LessonPlayer
          key={track.slug + "/" + lesson.slug}
          track={track}
          lesson={lesson}
          lab={lab}
          video={video}
          revealed={revealed}
        />
      </div>
    </main>
  );
}
