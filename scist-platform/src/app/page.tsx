import { Hero } from "@/components/marketing/hero";
import { ActivityTicker } from "@/components/marketing/activity-ticker";
import { TracksGrid } from "@/components/marketing/tracks-grid";
import { LoopSection } from "@/components/marketing/loop-section";
import { ChallengePreview } from "@/components/marketing/challenge-preview";
import { LeaderboardPreview } from "@/components/marketing/leaderboard-preview";
import { WhySection } from "@/components/marketing/why-section";
import { InstructorsSection } from "@/components/marketing/instructors-section";
import { CommunitySection } from "@/components/marketing/community-section";
import { CtaSection } from "@/components/marketing/cta-section";
import { getChallengesPublic, getEventsPublic, getTracksPublic } from "@/server/repo/content";
import { WeeklyChallengeBanner } from "@/components/challenges/weekly-challenge";
import { getInstructorsPublic, getPlayersPublic, getRecentActivity, getSiteStats, getWeeklyChallenge } from "@/server/repo/site";
import { getSettings } from "@/server/repo/settings";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const settings = await getSettings();
  const [tracks, challenges, events, instructors, players, activity, stats, weekly] = await Promise.all([
    getTracksPublic(),
    getChallengesPublic(),
    getEventsPublic(),
    getInstructorsPublic(),
    getPlayersPublic(settings.leaderboard.weekStartsOn),
    getRecentActivity(),
    getSiteStats(),
    getWeeklyChallenge(settings.weekly, settings.leaderboard.weekStartsOn),
  ]);

  return (
    <main>
      <Hero stats={{ challenges: stats.challenges, lessons: stats.lessons, users: stats.users }} />
      <ActivityTicker items={activity} />
      <TracksGrid tracks={tracks} />
      <LoopSection />
      {weekly ? (
        <div className="mx-auto max-w-7xl px-5">
          <WeeklyChallengeBanner weekly={weekly} />
        </div>
      ) : null}
      <ChallengePreview challenges={challenges} totalPoints={stats.totalPoints} boxes={stats.boxes} />
      <LeaderboardPreview players={players} ranks={settings.ranks} />
      <WhySection />
      <InstructorsSection instructors={instructors} />
      <CommunitySection events={events} />
      <CtaSection />
    </main>
  );
}
