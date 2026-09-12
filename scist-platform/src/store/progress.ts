"use client";

/**
 * Learner state.
 *
 * Everything here belongs to a signed-in account. The server is the source of
 * truth: the store is hydrated from GET /api/me and every action is mirrored
 * to the API, with the local copy acting as an optimistic cache so the header
 * and dashboard do not flash empty on reload.
 *
 * A visitor without a session gets the empty initial state and none of the
 * recording actions do anything. The pages that need progress (lesson
 * player, challenge page, dashboard) are gated server-side in src/proxy.ts;
 * the guards here only cover an expired or revoked session mid-page.
 */
import { create } from "zustand";
import { persist } from "zustand/middleware";
import { api } from "@/lib/api";
export { useHydrated } from "@/lib/use-now";

export type LessonKey = string; // "track-slug/lesson-slug"

export interface ActivityEntry {
  id: string;
  kind: "solve" | "lesson" | "checkpoint" | "hint" | "rankup";
  label: string;
  xp: number;
  at: string;
}

export type Role = "student" | "ta" | "instructor" | "admin";

/** What POST /api/progress returns for a checkpoint answer. */
export interface CheckpointResult {
  correct: boolean;
  awarded: number;
  explain?: string;
  checkpointsDone: number[];
}

export interface InstanceInfo {
  startedAt: number;
  host?: string | null;
  port?: number | null;
  expiresAt?: string | null;
}

/** What GET /api/me returns for a signed-in learner. */
export interface ServerProfile {
  authenticated: true;
  user: { id: string; handle: string; displayName: string | null; avatarUrl: string | null; role: Role; schoolId: string | null; school: string | null; schoolEditCount?: number };
  hasPassword: boolean;
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
  /** true once GET /api/me confirmed a session; false for visitors */
  authenticated: boolean;
  userId: string | null;
  /** set after the first /api/me round trip of this page load (not persisted) */
  sessionChecked: boolean;
  /** 這次 /api/me 發現帳號被停權了，登入視窗要說明原因（不持久化） */
  banned: boolean;

  handle: string;
  displayName: string;
  schoolId: string;
  schoolEditCount: number;
  role: Role;
  hasPassword: boolean;
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
  log: ActivityEntry[];

  hydrateFromServer: (profile: ServerProfile) => void;
  markGuest: () => void;
  logout: () => Promise<void>;
  /** admin console local mode only (NEXT_PUBLIC_ADMIN_API=local): a browser-side identity for /admin?as=… */
  setProfile: (handle: string, schoolId: string, role?: Role) => void;

  setWatched: (key: LessonKey, value: number) => void;
  completeLesson: (key: LessonKey, xp: number, title: string) => void;
  /** Sends the pick to the server, which decides. Returns its verdict. */
  answerCheckpoint: (key: LessonKey, index: number, choice: number) => Promise<CheckpointResult>;
  setNote: (key: LessonKey, note: string) => void;
  solveFlag: (slug: string, flagId: string, xp: number, name: string) => void;
  revealHint: (slug: string, hintId: string, cost: number) => void;
  spawnInstance: (slug: string, info?: Omit<InstanceInfo, "startedAt">) => void;
  killInstance: (slug: string) => void;
  toggleEvent: (id: string) => void;
  dismissBanned: () => void;
}

const initial = {
  authenticated: false,
  userId: null as string | null,
  handle: "guest",
  displayName: "",
  schoolId: "",
  schoolEditCount: 0,
  role: "student" as Role,
  hasPassword: false,
  xp: 0,
  watched: {} as Record<LessonKey, number>,
  completedLessons: [] as LessonKey[],
  checkpoints: {} as Record<LessonKey, number[]>,
  notes: {} as Record<LessonKey, string>,
  solved: {} as Record<string, string[]>,
  revealedHints: {} as Record<string, string[]>,
  instances: {} as Record<string, InstanceInfo>,
  registeredEvents: [] as string[],
  log: [] as ActivityEntry[],
  banned: false,
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
    const me = await api<{ authenticated: boolean; banned?: boolean } & Partial<ServerProfile>>("/api/me");
    if (me.authenticated) {
      useProgress.getState().hydrateFromServer(me as ServerProfile);
    } else {
      useProgress.getState().markGuest();
      // markGuest 會把狀態洗回初始值，所以旗標要在它之後才設
      if (me.banned) useProgress.setState({ banned: true });
    }
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

/* ------------------------------ store ------------------------------ */
export const useProgress = create<ProgressState>()(
  persist(
    (set, get) => ({
      ...initial,
      sessionChecked: false,
      banned: false,

      hydrateFromServer: (p) =>
        set({
          authenticated: true,
          sessionChecked: true,
          banned: false,
          userId: p.user.id,
          handle: p.user.handle,
          displayName: p.user.displayName?.trim() || "",
          role: p.user.role,
          hasPassword: Boolean(p.hasPassword),
          schoolId: p.user.schoolId ?? "",
          schoolEditCount: p.user.schoolEditCount ?? 0,
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
        }),

      /** No session: nothing of a previous account may linger in this browser. */
      markGuest: () => set({ ...initial, sessionChecked: true }),

      dismissBanned: () => set({ banned: false }),

      logout: async () => {
        await api("/api/auth/logout", { method: "POST" }).catch(() => undefined);
        set({ ...initial, sessionChecked: true });
      },

      setProfile: (handle, schoolId, role) => set((s) => ({ handle, displayName: s.displayName || handle, schoolId, role: role ?? s.role })),

      setWatched: (key, value) => {
        if (!get().authenticated) return;
        set((s) => ({ watched: { ...s.watched, [key]: Math.max(s.watched[key] ?? 0, value) } }));
        later("watched:" + key, 1500, () => {
          void api("/api/progress", { body: { action: "watched", ...split(key), value: get().watched[key] ?? value } }).catch(() => undefined);
        });
      },

      completeLesson: (key, xp, title) => {
        if (!get().authenticated) return;
        if (get().completedLessons.includes(key)) return;
        set((s) => ({
          completedLessons: [...s.completedLessons, key],
          xp: s.xp + xp,
          log: [entry("lesson", "完成課程 " + title, xp), ...s.log].slice(0, 60),
        }));
        mirror(() => api("/api/progress", { body: { action: "complete", ...split(key) } }));
      },

      answerCheckpoint: async (key, index, choice) => {
        if (!get().authenticated) throw new Error("請先登入");
        const res = await api<CheckpointResult>("/api/progress", {
          body: { action: "checkpoint", ...split(key), index, choice },
        });
        if (res.correct) {
          set((s) => ({
            checkpoints: { ...s.checkpoints, [key]: res.checkpointsDone },
            xp: s.xp + res.awarded,
            log: res.awarded > 0 ? [entry("checkpoint", "答對知識點檢查站", res.awarded), ...s.log].slice(0, 60) : s.log,
          }));
          scheduleRefresh();
        }
        return res;
      },

      setNote: (key, note) => {
        if (!get().authenticated) return;
        set((s) => ({ notes: { ...s.notes, [key]: note } }));
        later("note:" + key, 1000, () => {
          void api("/api/progress", { body: { action: "note", ...split(key), note: get().notes[key] ?? "" } }).catch(() => undefined);
        });
      },

      // the API call for flags / hints / instances / events happens in the
      // component (it needs the server's answer); these only update the cache
      solveFlag: (slug, flagId, xp, name) => {
        if (!get().authenticated) return;
        const cur = get().solved[slug] ?? [];
        if (cur.includes(flagId)) return;
        set((s) => ({
          solved: { ...s.solved, [slug]: [...cur, flagId] },
          xp: s.xp + xp,
          log: [entry("solve", "解出 " + name, xp), ...s.log].slice(0, 60),
        }));
      },

      revealHint: (slug, hintId, cost) => {
        if (!get().authenticated) return;
        const cur = get().revealedHints[slug] ?? [];
        if (cur.includes(hintId)) return;
        set((s) => ({
          revealedHints: { ...s.revealedHints, [slug]: [...cur, hintId] },
          xp: Math.max(0, s.xp - cost),
          log: [entry("hint", "解鎖提示", -cost), ...s.log].slice(0, 60),
        }));
      },

      spawnInstance: (slug, info) => {
        if (!get().authenticated) return;
        set((s) => ({ instances: { ...s.instances, [slug]: { startedAt: Date.now(), ...info } } }));
      },

      killInstance: (slug) =>
        set((s) => {
          const next = { ...s.instances };
          delete next[slug];
          return { instances: next };
        }),

      toggleEvent: (id) => {
        if (!get().authenticated) return;
        set((s) => ({
          registeredEvents: s.registeredEvents.includes(id) ? s.registeredEvents.filter((e) => e !== id) : [...s.registeredEvents, id],
        }));
      },
    }),
    {
      name: "scist-gate-progress",
      // v3: visitors no longer keep progress in the browser, so a signed-out
      // store persists nothing but the flag itself
      version: 3,
      partialize: (s) =>
        (s.authenticated
          ? Object.fromEntries(Object.entries(s).filter(([k]) => k !== "sessionChecked" && k !== "banned"))
          : { authenticated: false, userId: null }) as ProgressState,
      migrate: (persisted, version) => {
        const p = (persisted ?? {}) as Partial<ProgressState>;
        // anything a visitor accumulated before v3 is dropped; a signed-in cache is kept as-is
        if (version < 3) return (p.authenticated ? p : { authenticated: false, userId: null }) as ProgressState;
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
