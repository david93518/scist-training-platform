"use client";

/**
 * Local admin data — the "皮" runs against this until the HTTP API is wired.
 * Seeded once from src/data, then persisted in the browser under its own key.
 * Edits here do not reach the public pages; that is what the API is for.
 */
import { create } from "zustand";
import { persist } from "zustand/middleware";
import { nanoid } from "nanoid";
import { TRACKS } from "@/data/tracks";
import { CHALLENGES } from "@/data/challenges";
import { EVENTS } from "@/data/events";
import { QUESTIONS } from "@/data/questions";
import { PLAYERS } from "@/data/players";
import { INSTRUCTORS } from "@/data/instructors";
import { DEFAULT_SETTINGS } from "@/lib/settings-defaults";
import type {
  AdminChallenge,
  AdminEvent,
  AdminInstance,
  AdminInstructor,
  AdminLesson,
  AdminQuestion,
  AdminSettings,
  AdminTrack,
  AdminUser,
  AuditEntry,
  XpEntry,
} from "./types";

export interface AdminData {
  tracks: AdminTrack[];
  lessons: AdminLesson[];
  challenges: AdminChallenge[];
  events: AdminEvent[];
  users: AdminUser[];
  questions: AdminQuestion[];
  settings: AdminSettings;
  instructors: AdminInstructor[];
  instances: AdminInstance[];
  audit: AuditEntry[];
  /** manual XP adjustments made in local mode, per user id */
  ledger: Record<string, XpEntry[]>;
}

interface AdminStore extends AdminData {
  seededAt: string | null;
  seed: () => void;
  set: <K extends keyof AdminData>(key: K, value: AdminData[K]) => void;
  reset: () => void;
}

export function buildSeed(): AdminData {
  const now = new Date().toISOString();
  const tracks: AdminTrack[] = TRACKS.map((t, i) => ({
    id: t.id,
    slug: t.slug,
    name: t.name,
    en: t.en,
    tagline: t.tagline,
    icon: t.icon,
    color: t.color,
    level: t.level,
    difficulty: t.difficulty,
    outcome: t.outcome,
    syllabus: t.syllabus,
    instructorId: t.instructorId,
    sortOrder: i,
    status: "published",
    modules: t.modules.map((m, mi) => ({ id: t.id + "-m" + (mi + 1), title: m.title, sortOrder: mi })),
  }));

  const lessons: AdminLesson[] = TRACKS.flatMap((t) =>
    t.modules.flatMap((m, mi) =>
      m.lessons.map((l, li) => ({
        id: l.id,
        trackId: t.id,
        moduleId: t.id + "-m" + (mi + 1),
        slug: l.slug,
        title: l.title,
        summary: l.summary,
        durationSec: l.durationSec,
        xp: l.xp,
        videoProvider: "none" as const,
        videoId: null,
        videoStatus: "none" as const,
        content: l.content,
        checkpoints: l.checkpoints,
        labSlug: l.labSlug ?? null,
        sortOrder: li,
        status: "published" as const,
        updatedAt: now,
      })),
    ),
  );

  const challenges: AdminChallenge[] = CHALLENGES.map((c) => ({
    id: c.id,
    slug: c.slug,
    name: c.name,
    category: c.category,
    difficulty: c.difficulty,
    kind: c.kind,
    blurb: c.blurb,
    description: c.description,
    tags: c.tags,
    authorId: c.authorId,
    tutorial: Boolean(c.tutorial),
    lessonRef: c.lesson ?? null,
    connectionType: c.connection?.type ?? "none",
    connectionValue: c.connection?.value ?? null,
    instanceImage: c.connection ? "ghcr.io/scist/" + c.slug + ":latest" : null,
    instancePort: c.connection?.type === "http" ? 80 : c.connection ? 1337 : null,
    instanceTtlMin: 120,
    baseSolves: c.solves,
    rating: c.rating,
    status: "published",
    releasedAt: c.releasedAt,
    flags: c.flags.map((f) => ({ id: c.id + "-" + f.id, flagId: f.id, label: f.label, sha256: f.sha256, points: f.points })),
    hints: c.hints.map((h) => ({ id: c.id + "-" + h.id, text: h.text, cost: h.cost })),
    files: (c.files ?? []).map((name) => ({ id: nanoid(8), name, size: null, objectKey: null, status: "listed" as const })),
    updatedAt: now,
  }));

  const events: AdminEvent[] = EVENTS.map((e) => ({
    id: e.id,
    type: e.type,
    title: e.title,
    summary: e.summary,
    startsAt: e.startsAt,
    durationMin: e.durationMin,
    mode: e.mode === "線上" ? "online" : "offline",
    location: e.location,
    hostId: e.hostId,
    capacity: e.capacity,
    baseRegistered: e.registered,
    tags: e.tags,
    status: "published",
  }));

  const users: AdminUser[] = PLAYERS.map((p, i) => ({
    id: p.id,
    handle: p.handle,
    displayName: p.handle,
    schoolId: p.schoolId,
    role: p.isAssistant ? "ta" : "student",
    xp: p.xp,
    solves: p.solves,
    lastSeenAt: new Date(Date.now() - i * 3600_000 * 5).toISOString(),
    bannedAt: null,
  }));

  const questions: AdminQuestion[] = QUESTIONS.map((q) => ({
    id: q.id,
    scope: q.scope,
    refId: q.refId,
    title: q.title,
    body: q.body,
    authorHandle: q.author,
    votes: q.votes,
    createdAt: q.createdAt,
    acceptedAnswerId: q.answers.find((a) => a.accepted)?.id ?? null,
    answers: q.answers.map((a) => ({
      id: a.id,
      authorHandle: a.author,
      authorRole: a.role,
      body: a.body,
      createdAt: a.createdAt,
      votes: a.votes,
    })),
  }));

  const instructors: AdminInstructor[] = INSTRUCTORS.map((i, k) => ({
    id: i.id,
    name: i.name,
    handle: i.handle,
    role: i.role,
    domains: i.domains,
    bio: i.bio,
    creds: i.creds,
    accent: i.accent,
    userId: null,
    sortOrder: k,
  }));

  // a handful of "running" environments so the instances page has something to show
  const withImage = challenges.filter((c) => c.instanceImage);
  const instances: AdminInstance[] = [3, 5, 7, 8, 11]
    .filter((k) => users[k] && withImage[k % withImage.length])
    .map((k, i) => {
      const u = users[k];
      const c = withImage[k % withImage.length];
      const started = Date.now() - (i * 17 + 4) * 60_000;
      return {
        id: "inst-" + i,
        userId: u.id,
        userHandle: u.handle,
        challengeId: c.id,
        challengeSlug: c.slug,
        challengeName: c.name,
        host: "10.31.4." + (20 + i),
        port: 31000 + i * 7,
        status: i === 4 ? ("starting" as const) : ("running" as const),
        createdAt: new Date(started).toISOString(),
        expiresAt: new Date(started + c.instanceTtlMin * 60_000).toISOString(),
      };
    });

  const settings: AdminSettings = structuredClone(DEFAULT_SETTINGS);

  return { tracks, lessons, challenges, events, users, questions, settings, instructors, instances, audit: [], ledger: {} };
}

const empty: AdminData = {
  tracks: [],
  lessons: [],
  challenges: [],
  events: [],
  users: [],
  questions: [],
  settings: buildSeed().settings,
  instructors: [],
  instances: [],
  audit: [],
  ledger: {},
};

export const useAdminStore = create<AdminStore>()(
  persist(
    (set, get) => ({
      ...empty,
      seededAt: null,
      seed: () => {
        if (get().seededAt) return;
        set({ ...buildSeed(), seededAt: new Date().toISOString() });
      },
      set: (key, value) => set({ [key]: value } as Partial<AdminData>),
      reset: () => set({ ...buildSeed(), seededAt: new Date().toISOString() }),
    }),
    {
      name: "scist-gate-admin",
      version: 2,
      // v1 browsers keep their edits; the new collections are filled from the seed
      migrate: (persisted, version) => {
        const p = (persisted ?? {}) as Partial<AdminStore>;
        if (version < 2 && p.seededAt) {
          const seed = buildSeed();
          return {
            ...p,
            instructors: p.instructors ?? seed.instructors,
            instances: p.instances ?? seed.instances,
            audit: p.audit ?? [],
            ledger: p.ledger ?? {},
          } as AdminStore;
        }
        return p as AdminStore;
      },
    },
  ),
);
