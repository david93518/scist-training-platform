/**
 * Admin-side data shapes. These mirror the database rows in
 * src/server/db/schema.ts one-to-one, so the local adapter (browser storage)
 * and the HTTP adapter (real API) return the same objects.
 */
import type { ContentBlock, Checkpoint } from "@/data/tracks";
import type { Difficulty } from "@/lib/xp";
import type { CertRule } from "@/lib/certifications";
import type { Category } from "@/data/challenges";
import type { EventType } from "@/data/events";

export type Status = "draft" | "published" | "archived";
export type Role = "student" | "ta" | "instructor" | "admin";
export type VideoProvider = "none" | "youtube" | "stream";
export type VideoStatus = "none" | "uploading" | "processing" | "ready" | "error";
export type ConnectionType = "none" | "http" | "nc" | "ssh";

export interface AdminModule {
  id: string;
  title: string;
  sortOrder: number;
}

export interface AdminTrack {
  id: string;
  slug: string;
  name: string;
  en: string;
  tagline: string;
  icon: string;
  color: string;
  level: string;
  difficulty: Difficulty;
  outcome: string;
  syllabus: string[];
  instructorId: string | null;
  sortOrder: number;
  status: Status;
  modules: AdminModule[];
}

export interface AdminLesson {
  id: string;
  trackId: string;
  moduleId: string;
  slug: string;
  title: string;
  summary: string;
  durationSec: number;
  xp: number;
  videoProvider: VideoProvider;
  videoId: string | null;
  videoStatus: VideoStatus;
  content: ContentBlock[];
  checkpoints: Checkpoint[];
  labSlug: string | null;
  sortOrder: number;
  status: Status;
  updatedAt: string;
}

export interface AdminFlag {
  id: string;
  flagId: string;
  label: string;
  sha256: string;
  points: number;
  /** present only while editing; never persisted */
  plaintext?: string;
}

export interface AdminHint {
  id: string;
  text: string;
  cost: number;
}

export interface AdminFile {
  id: string;
  name: string;
  size: number | null;
  objectKey: string | null;
  status: "listed" | "uploading" | "ready";
}

export interface AdminChallenge {
  id: string;
  slug: string;
  name: string;
  category: Category;
  difficulty: Difficulty;
  kind: "challenge" | "box";
  blurb: string;
  description: string[];
  tags: string[];
  authorId: string | null;
  tutorial: boolean;
  lessonRef: string | null;
  connectionType: ConnectionType;
  connectionValue: string | null;
  instanceImage: string | null;
  instancePort: number | null;
  instanceTtlMin: number;
  baseSolves: number;
  rating: number;
  status: Status;
  releasedAt: string | null;
  flags: AdminFlag[];
  hints: AdminHint[];
  files: AdminFile[];
  updatedAt: string;
}

export interface AdminEvent {
  id: string;
  type: EventType;
  title: string;
  summary: string;
  startsAt: string;
  durationMin: number;
  mode: "online" | "offline";
  location: string;
  hostId: string | null;
  capacity: number;
  baseRegistered: number;
  tags: string[];
  status: Status;
}

export interface AdminUser {
  id: string;
  handle: string;
  displayName: string;
  schoolId: string | null;
  role: Role;
  xp: number;
  solves: number;
  /** 助教貢獻：回答數與被採納數 */
  answers: number;
  accepted: number;
  lastSeenAt: string | null;
  bannedAt: string | null;
  hasPassword: boolean;
}

export interface AdminAnswer {
  id: string;
  authorHandle: string;
  authorRole: string;
  body: string;
  createdAt: string;
  /** 作者改過的時間；沒改過是 null */
  editedAt: string | null;
  votes: number;
}

export interface AdminQuestion {
  id: string;
  scope: "lesson" | "challenge";
  refId: string;
  title: string;
  body: string;
  authorHandle: string;
  votes: number;
  createdAt: string;
  editedAt: string | null;
  acceptedAnswerId: string | null;
  answers: AdminAnswer[];
}

export interface RankRule {
  id: string;
  name: string;
  en: string;
  minXp: number;
  color: string;
  blurb: string;
}

export interface AdminSettings {
  site: { name: string; tagline: string; discordInvite: string; launch: string };
  ranks: RankRule[];
  /** 企劃書的三級認證，條件是完課與解題，跟 ranks 的 XP 門檻無關 */
  certifications: CertRule[];
  xp: { checkpointDefault: number; lessonDefault: number; hintRefundOnSolve: boolean };
  leaderboard: { weekStartsOn: number };
  /** 本週指定挑戰；slug 留空就整個功能不出現 */
  weekly: { slug: string; note: string; bonusXp: number };
  features: { instances: boolean; questions: boolean };
}

export interface IntegrationStatus {
  mode: "local" | "http";
  database: "local-storage" | "pglite" | "postgres";
  discordLogin: boolean;
  stream: boolean;
  r2: boolean;
  instancer: boolean;
  webhook: boolean;
  sentry: boolean;
}

export interface StuckPoint {
  slug: string;
  name: string;
  attempts: number;
  solves: number;
  rate: number;
}

export interface AdminStats {
  users: number;
  activeWeek: number;
  lessonsCompleted: number;
  solves: number;
  drafts: number;
  stuck: StuckPoint[];
  recent: { kind: "lesson" | "challenge" | "event"; title: string; at: string; status: Status }[];
}

export interface UploadTicket {
  /** "direct" = browser uploads straight to the storage provider; "mock" = pretend */
  mode: "direct" | "mock";
  uploadUrl?: string;
  /** what to store on the lesson / file once the upload succeeds */
  id: string;
  objectKey?: string;
}

/* ------------------------------------------------------------------ */
/* instructors, ops, analytics                                          */
/* ------------------------------------------------------------------ */
export interface AdminInstructor {
  id: string;
  name: string;
  handle: string;
  /** title shown on the site, e.g. "Web / 平台核心講師" */
  role: string;
  domains: string[];
  bio: string;
  creds: string[];
  accent: string;
  /** users.id once the instructor has logged in with Discord */
  userId: string | null;
  sortOrder: number;
}

export type InstanceStatus = "starting" | "running" | "stopped" | "error";

export interface AdminInstance {
  id: string;
  userId: string;
  userHandle: string;
  challengeId: string;
  challengeSlug: string;
  challengeName: string;
  host: string | null;
  port: number | null;
  status: InstanceStatus;
  createdAt: string;
  expiresAt: string;
}

export type AuditAction = "save" | "delete" | "role" | "ban" | "unban" | "xp" | "kill" | "import" | "settings" | "answer" | "accept" | "reorder" | "password";

/** 一個欄位的改前改後，值都已經格式化成人看得懂的字串 */
export interface AuditChange {
  /** 欄位鍵，設定類會是 site.name 這種路徑 */
  field: string;
  label: string;
  before: string;
  after: string;
}

export interface AuditEntry {
  id: string;
  actorHandle: string;
  action: AuditAction;
  /** lesson | challenge | track | event | user | question | settings | instance | instructor */
  entity: string;
  entityId: string | null;
  label: string;
  /** 有逐欄位明細時才有；停權、關靶機這種沒有欄位可比的就是空的 */
  changes: AuditChange[];
  at: string;
}

export type XpReason = "checkpoint" | "lesson" | "solve" | "hint" | "event" | "admin";

export interface XpEntry {
  id: string;
  delta: number;
  reason: XpReason;
  label: string;
  at: string;
}

export interface AdminUserDetail {
  user: AdminUser;
  joinedAt: string | null;
  ledger: XpEntry[];
  solves: { slug: string; name: string; points: number; at: string }[];
  lessons: { title: string; track: string; watched: number; completed: boolean }[];
  questions: number;
}

export interface AdminAnalytics {
  generatedAt: string;
  /** last 12 weeks, oldest first */
  weeks: { label: string; active: number; solves: number; completions: number }[];
  funnel: { label: string; value: number }[];
  /** the four numbers the proposal set targets for */
  kpi: { registered: number; monthlyActive: number; completionRate: number; schools: number };
  tracks: { id: string; name: string; color: string; lessons: number; learners: number; completions: number; rate: number }[];
  categories: { category: Category; label: string; color: string; attempts: number; solves: number; rate: number }[];
  schools: { schoolId: string; school: string; members: number; xp: number; solves: number }[];
  /** lessons people start but do not finish, lowest completion first */
  dropoff: { id: string; title: string; track: string; started: number; completed: number; rate: number }[];
}
