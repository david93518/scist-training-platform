"use client";

/**
 * Learner state.
 *
 * Guests keep everything in this browser (localStorage). Once signed in, the
 * server is the source of truth: the store is hydrated from GET /api/me and
 * every action is mirrored to the API, with the local copy acting as an
 * optimistic cache. Guest progress made before signing in is replayed to the
 * account on the first hydration.
 */
import { create } from "zustand";
import { persist } from "zustand/middleware";
import { api } from "@/lib/api";
export { useHydrated } from "@/lib/use-now";

export type LessonKey = string; // "track-slug/lesson-slug"

export interface PostedQuestion {
  id: string;
  scope: "lesson" | "challenge";
  refId: string;
  title: string;
  body: string;
  createdAt: string;
}

export interface ActivityEntry {
  id: string;
  kind: "solve" | "lesson" | "checkpoint" | "hint" | "rankup";
  label: string;
  xp: number;
  at: string;
}

export type Role = "student" | "ta" | "instructor" | "admin";

export interface InstanceInfo {
  startedAt: number;
  host?: string | null;
  port?: number | null;
  expiresAt?: string | null;
}

/** What GET /api/me returns for a signed-in learner. */
export interface ServerProfile {
  authenticated: true;
  user: { id: string; handle: string; displayName: string | null; avatarUrl: string | null; role: Role; schoolId: string | null; school: string | null };
  xp: number;
  watched: Record<LessonKey, number>;
  completedLessons: LessonKey[];
  checkpoints: Record<LessonKey, number[]>;
  notes: Record<LessonKey, string>;
  solved: Record<string, string[]>;
  revealedHints: Record<string, string[]>;
  instances: Record<string, InstanceInfo>;
  registeredEvents: string[];
  log: ActivityEntry[];
}

interface ProgressState {
  /** true once GET /api/me confirmed a session; false for guests */
  authenticated: boolean;
  userId: string | null;
  /** set after the first /api/me round trip of this page load (not persisted) */
  sessionChecked: boolean;

  handle: string;
  schoolId: string;
  role: Role;
  xp: number;

  /** 0..1 watch position per lesson */
  watched: Record<LessonKey, number>;
  completedLessons: LessonKey[];
  /** correct checkpoint indices per lesson */
  checkpoints: Record<LessonKey, number[]>;
  notes: Record<LessonKey, string>;

  /** flag ids solved, per challenge slug */
  solved: Record<string, string[]>;
  revealedHints: Record<string, string[]>;
  instances: Record<string, InstanceInfo>;

  registeredEvents: string[];
  askedQuestions: PostedQuestion[];
  log: ActivityEntry[];

  hydrateFromServer: (profile: ServerProfile) => void;
  markGuest: () => void;
  logout: () => Promise<void>;
  /** guest-only local identity (and the admin console's local mode) */
  setProfile: (handle: string, schoolId: string, role?: Role) => void;

  setWatched: (key: LessonKey, value: number) => void;
  completeLesson: (key: LessonKey, xp: number, title: string) => void;
  answerCheckpoint: (key: LessonKey, index: number, xp: number) => void;
  setNote: (key: LessonKey, note: string) => void;
  solveFlag: (slug: string, flagId: string, xp: number, name: string) => void;
  revealHint: (slug: string, hintId: string, cost: number) => void;
  spawnInstance: (slug: string, info?: Omit<InstanceInfo, "startedAt">) => void;
  killInstance: (slug: string) => void;
  toggleEvent: (id: string) => void;
  askQuestion: (q: Omit<PostedQuestion, "id" | "createdAt">) => void;
  reset: () => void;
}

const initial = {
  authenticated: false,
  userId: null as string | null,
  handle: "guest",
  schoolId: "tnfsh",
  role: "student" as Role,
  xp: 0,
  watched: {} as Record<LessonKey, number>,
  completedLessons: [] as LessonKey[],
  checkpoints: {} as Record<LessonKey, number[]>,
  notes: {} as Record<LessonKey, string>,
  solved: {} as Record<string, string[]>,
  revealedHints: {} as Record<string, string[]>,
  instances: {} as Record<string, InstanceInfo>,
  registeredEvents: [] as string[],
  askedQuestions: [] as PostedQuestion[],
  log: [] as ActivityEntry[],
};

function entry(kind: ActivityEntry["kind"], label: string, xp: number): ActivityEntry {
  return {
    id: kind + "-" + Date.now() + "-" + Math.random().toString(36).slice(2, 7),
    kind,
    label,
    xp,
    at: new Date().toISOString(),
  };
}

/* ------------------------------ server sync ------------------------------ */
const timers = new Map<string, ReturnType<typeof setTimeout>>();
function later(key: string, ms: number, fn: () => void) {
  clearTimeout(timers.get(key));
  timers.set(key, setTimeout(fn, ms));
}

function split(key: LessonKey) {
  const i = key.indexOf("/");
  return { track: key.slice(0, i), lesson: key.slice(i + 1) };
}

let lastRefresh = 0;

/** Pulls GET /api/me and hydrates the store. Throttled unless forced. */
export async function refreshProfile(force = false) {
  if (typeof window === "undefined") return;
  if (!force && Date.now() - lastRefresh < 4000) return;
  lastRefresh = Date.now();
  try {
    const me = await api<{ authenticated: boolean } & Partial<ServerProfile>>("/api/me");
    if (me.authenticated) useProgress.getState().hydrateFromServer(me as ServerProfile);
    else useProgress.getState().markGuest();
  } catch {
    useProgress.setState({ sessionChecked: true });
  }
}

function scheduleRefresh() {
  later("refresh", 600, () => void refreshProfile(true));
}

/** Fire an API mutation for a signed-in learner, then re-sync. Failures only log. */
function mirror(action: () => Promise<unknown>) {
  action()
    .then(() => scheduleRefresh())
    .catch((e) => console.warn("[progress] sync failed", e));
}

type GuestSnapshot = Pick<ProgressState, "watched" | "checkpoints" | "completedLessons" | "notes">;

function hasGuestProgress(s: GuestSnapshot) {
  return (
    Object.values(s.watched).some((v) => v > 0) ||
    Object.values(s.checkpoints).some((a) => a.length > 0) ||
    s.completedLessons.length > 0 ||
    Object.values(s.notes).some((n) => n.trim().length > 0)
  );
}

/** Replays what a guest did in this browser onto the account they just signed in to. */
async function mergeGuestProgress(snap: GuestSnapshot) {
  const post = (body: Record<string, unknown>) => api("/api/progress", { body }).catch(() => undefined);
  for (const [key, value] of Object.entries(snap.watched)) if (value > 0) await post({ action: "watched", ...split(key), value });
  for (const [key, indices] of Object.entries(snap.checkpoints)) for (const index of indices) await post({ action: "checkpoint", ...split(key), index });
  for (const key of snap.completedLessons) await post({ action: "complete", ...split(key) });
  for (const [key, note] of Object.entries(snap.notes)) if (note.trim()) await post({ action: "note", ...split(key), note });
  await refreshProfile(true);
}

/* ------------------------------ store ------------------------------ */
export const useProgress = create<ProgressState>()(
  persist(
    (set, get) => ({
      ...initial,
      sessionChecked: false,

      hydrateFromServer: (p) => {
        const s = get();
        const snapshot = !s.authenticated && hasGuestProgress(s) ? { watched: s.watched, checkpoints: s.checkpoints, completedLessons: s.completedLessons, notes: s.notes } : null;
        set({
          authenticated: true,
          sessionChecked: true,
          userId: p.user.id,
          handle: p.user.handle,
          role: p.user.role,
          schoolId: p.user.schoolId ?? s.schoolId,
          xp: p.xp,
          watched: p.watched ?? {},
          completedLessons: p.completedLessons ?? [],
          checkpoints: p.checkpoints ?? {},
          notes: p.notes ?? {},
          solved: p.solved ?? {},
          revealedHints: p.revealedHints ?? {},
          instances: p.instances ?? {},
          registeredEvents: p.registeredEvents ?? [],
          log: p.log ?? [],
          askedQuestions: [],
        });
        if (snapshot) void mergeGuestProgress(snapshot);
      },

      markGuest: () =>
        set((s) => (s.authenticated ? { ...initial, sessionChecked: true } : { sessionChecked: true, authenticated: false, userId: null })),

      logout: async () => {
        await api("/api/auth/logout", { method: "POST" }).catch(() => undefined);
        set({ ...initial, sessionChecked: true });
      },

      setProfile: (handle, schoolId, role) => set((s) => ({ handle, schoolId, role: role ?? s.role })),

      setWatched: (key, value) => {
        set((s) => ({ watched: { ...s.watched, [key]: Math.max(s.watched[key] ?? 0, value) } }));
        if (get().authenticated) {
          later("watched:" + key, 1500, () => {
            void api("/api/progress", { body: { action: "watched", ...split(key), value: get().watched[key] ?? value } }).catch(() => undefined);
          });
        }
      },

      completeLesson: (key, xp, title) => {
        if (get().completedLessons.includes(key)) return;
        set((s) => ({
          completedLessons: [...s.completedLessons, key],
          xp: s.xp + xp,
          log: [entry("lesson", "完成課程 " + title, xp), ...s.log].slice(0, 60),
        }));
        if (get().authenticated) mirror(() => api("/api/progress", { body: { action: "complete", ...split(key) } }));
      },

      answerCheckpoint: (key, index, xp) => {
        const done = get().checkpoints[key] ?? [];
        if (done.includes(index)) return;
        set((s) => ({
          checkpoints: { ...s.checkpoints, [key]: [...done, index] },
          xp: s.xp + xp,
          log: [entry("checkpoint", "答對知識點檢查站", xp), ...s.log].slice(0, 60),
        }));
        if (get().authenticated) mirror(() => api("/api/progress", { body: { action: "checkpoint", ...split(key), index } }));
      },

      setNote: (key, note) => {
        set((s) => ({ notes: { ...s.notes, [key]: note } }));
        if (get().authenticated) {
          later("note:" + key, 1000, () => {
            void api("/api/progress", { body: { action: "note", ...split(key), note: get().notes[key] ?? "" } }).catch(() => undefined);
          });
        }
      },

      // the API call for flags / hints / instances / events happens in the
      // component (it needs the server's answer); these only update the cache
      solveFlag: (slug, flagId, xp, name) => {
        const cur = get().solved[slug] ?? [];
        if (cur.includes(flagId)) return;
        set((s) => ({
          solved: { ...s.solved, [slug]: [...cur, flagId] },
          xp: s.xp + xp,
          log: [entry("solve", "解出 " + name, xp), ...s.log].slice(0, 60),
        }));
      },

      revealHint: (slug, hintId, cost) => {
        const cur = get().revealedHints[slug] ?? [];
        if (cur.includes(hintId)) return;
        set((s) => ({
          revealedHints: { ...s.revealedHints, [slug]: [...cur, hintId] },
          xp: Math.max(0, s.xp - cost),
          log: [entry("hint", "解鎖提示", -cost), ...s.log].slice(0, 60),
        }));
      },

      spawnInstance: (slug, info) => set((s) => ({ instances: { ...s.instances, [slug]: { startedAt: Date.now(), ...info } } })),

      killInstance: (slug) =>
        set((s) => {
          const next = { ...s.instances };
          delete next[slug];
          return { instances: next };
        }),

      toggleEvent: (id) =>
        set((s) => ({
          registeredEvents: s.registeredEvents.includes(id) ? s.registeredEvents.filter((e) => e !== id) : [...s.registeredEvents, id],
        })),

      askQuestion: (q) =>
        set((s) => ({
          askedQuestions: [{ ...q, id: "local-" + Date.now(), createdAt: new Date().toISOString() }, ...s.askedQuestions],
        })),

      reset: () => set({ ...initial, sessionChecked: get().sessionChecked }),
    }),
    {
      name: "scist-gate-progress",
      version: 2,
      partialize: (s) => Object.fromEntries(Object.entries(s).filter(([k]) => k !== "sessionChecked")) as ProgressState,
      migrate: (persisted, version) => {
        const p = (persisted ?? {}) as Partial<ProgressState> & { instances?: Record<string, number | InstanceInfo> };
        if (version < 2) {
          const instances: Record<string, InstanceInfo> = {};
          for (const [slug, v] of Object.entries(p.instances ?? {})) instances[slug] = typeof v === "number" ? { startedAt: v } : v;
          return { ...p, instances, authenticated: false, userId: null } as ProgressState;
        }
        return p as ProgressState;
      },
    },
  ),
);

// ---- selectors ----
export function lessonKey(trackSlug: string, lessonSlug: string): LessonKey {
  return trackSlug + "/" + lessonSlug;
}

export function useIsLessonDone(key: LessonKey) {
  return useProgress((s) => s.completedLessons.includes(key));
}

export function useSolvedCount() {
  return useProgress((s) => Object.keys(s.solved).length);
}
