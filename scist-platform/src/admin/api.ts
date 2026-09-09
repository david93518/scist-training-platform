"use client";

/**
 * The admin console talks to exactly one interface, AdminApi.
 *
 *   httpApi  — the REST API documented in docs/API.md. The default.
 *   localApi — browser storage, for looking at the screens without a
 *              session. Set NEXT_PUBLIC_ADMIN_API=local to use it.
 *
 * Both return identical shapes (src/admin/types.ts), so nothing in the UI
 * changes when the backend is wired.
 */
import { nanoid } from "nanoid";
import { useAdminStore, buildSeed } from "./store";
import { useProgress } from "@/store/progress";
import { CATEGORY_META, type Category } from "@/data/challenges";
import { schoolById } from "@/data/schools";
import { seeded } from "@/lib/utils";
import type {
  AdminAnalytics,
  AdminChallenge,
  AdminEvent,
  AdminInstance,
  AdminInstructor,
  AdminLesson,
  AdminQuestion,
  AdminSettings,
  AdminStats,
  AdminTrack,
  AdminUser,
  AdminUserDetail,
  AuditAction,
  AuditEntry,
  IntegrationStatus,
  Role,
  UploadTicket,
  VideoStatus,
  XpEntry,
} from "./types";

export interface AdminApi {
  mode: "local" | "http";
  stats(): Promise<AdminStats>;
  status(): Promise<IntegrationStatus>;
  analytics(): Promise<AdminAnalytics>;
  tracks: {
    list(): Promise<AdminTrack[]>;
    save(track: AdminTrack): Promise<AdminTrack>;
    remove(id: string): Promise<void>;
  };
  lessons: {
    list(): Promise<AdminLesson[]>;
    save(lesson: AdminLesson): Promise<AdminLesson>;
    remove(id: string): Promise<void>;
    reorder(moduleId: string, ids: string[]): Promise<void>;
  };
  challenges: {
    list(): Promise<AdminChallenge[]>;
    save(challenge: AdminChallenge): Promise<AdminChallenge>;
    remove(id: string): Promise<void>;
  };
  events: {
    list(): Promise<AdminEvent[]>;
    save(event: AdminEvent): Promise<AdminEvent>;
    remove(id: string): Promise<void>;
  };
  instructors: {
    list(): Promise<AdminInstructor[]>;
    save(instructor: AdminInstructor): Promise<AdminInstructor>;
    remove(id: string): Promise<void>;
  };
  users: {
    list(): Promise<AdminUser[]>;
    detail(id: string): Promise<AdminUserDetail>;
    setRole(id: string, role: Role): Promise<void>;
    setBanned(id: string, banned: boolean): Promise<void>;
    /** manual XP correction; resolves to the user's new total */
    adjustXp(id: string, delta: number, reason: string): Promise<number>;
  };
  questions: {
    list(): Promise<AdminQuestion[]>;
    answer(questionId: string, body: string, author: { handle: string; role: string }): Promise<void>;
    accept(questionId: string, answerId: string): Promise<void>;
    remove(questionId: string): Promise<void>;
  };
  instances: {
    list(): Promise<AdminInstance[]>;
    kill(id: string): Promise<void>;
    /** resolves to how many were stopped */
    killAll(): Promise<number>;
  };
  audit: {
    list(limit?: number): Promise<AuditEntry[]>;
  };
  settings: {
    get(): Promise<AdminSettings>;
    save(settings: AdminSettings): Promise<AdminSettings>;
  };
  uploads: {
    /** Cloudflare Stream direct upload ticket for a lesson video */
    video(lessonId: string, file: { name: string; size: number; type: string }): Promise<UploadTicket>;
    /** R2 presigned PUT for a challenge attachment */
    file(challengeId: string, file: { name: string; size: number; type: string }): Promise<UploadTicket>;
    /** poll Stream until the video is playable */
    videoStatus(videoId: string): Promise<VideoStatus>;
  };
  importCtfd(payload: unknown): Promise<{ imported: number; skipped: number }>;
  exportAll(): Promise<unknown>;
}

/* ------------------------------------------------------------------ */
/* local adapter                                                        */
/* ------------------------------------------------------------------ */
const delay = (ms = 120) => new Promise((r) => setTimeout(r, ms));
const now = () => new Date().toISOString();
const daysAgo = (d: number) => new Date(Date.now() - d * 86400_000).toISOString();

function hashStr(s: string) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return h >>> 0;
}

function store() {
  const s = useAdminStore.getState();
  if (!s.seededAt) s.seed();
  return useAdminStore.getState();
}

/** every local mutation leaves a line in the audit log, same as the API does */
function log(action: AuditAction, entity: string, entityId: string | null, label: string) {
  const s = useAdminStore.getState();
  const entry: AuditEntry = { id: nanoid(10), actorHandle: useProgress.getState().handle || "guest", action, entity, entityId, label, at: now() };
  s.set("audit", [entry, ...s.audit].slice(0, 500));
}

const DIFF_FACTOR = { easy: 1.5, medium: 2.4, hard: 3.6, insane: 5 } as const;

export const localApi: AdminApi = {
  mode: "local",

  async stats() {
    const s = store();
    const drafts =
      s.lessons.filter((l) => l.status === "draft").length +
      s.challenges.filter((c) => c.status === "draft").length +
      s.events.filter((e) => e.status === "draft").length;
    // solve-rate proxy: low seed solves relative to points means people get stuck
    const stuck = [...s.challenges]
      .map((c) => {
        const attempts = Math.round(c.baseSolves * (1.6 + (c.difficulty === "insane" ? 4 : c.difficulty === "hard" ? 2.6 : c.difficulty === "medium" ? 1.4 : 0.5)));
        return { slug: c.slug, name: c.name, attempts, solves: c.baseSolves, rate: attempts ? c.baseSolves / attempts : 0 };
      })
      .sort((a, b) => a.rate - b.rate)
      .slice(0, 6);
    const recent = [
      ...s.lessons.map((l) => ({ kind: "lesson" as const, title: l.title, at: l.updatedAt, status: l.status })),
      ...s.challenges.map((c) => ({ kind: "challenge" as const, title: c.name, at: c.updatedAt, status: c.status })),
    ]
      .sort((a, b) => b.at.localeCompare(a.at))
      .slice(0, 8);
    return {
      users: 2147,
      activeWeek: 863,
      lessonsCompleted: 5120,
      solves: s.challenges.reduce((n, c) => n + c.baseSolves, 0),
      drafts,
      stuck,
      recent,
    };
  },

  async status() {
    return { mode: "local", database: "local-storage", discordLogin: false, stream: false, r2: false, instancer: false, webhook: false };
  },

  /** deterministic demo numbers; the API computes the same shape from the ledger */
  async analytics() {
    const s = store();
    const rnd = seeded(20260909);
    const weeks = Array.from({ length: 12 }, (_, k) => {
      const start = new Date(Date.now() - (12 - k) * 7 * 86400_000);
      const growth = 1 + k * 0.045;
      return {
        label: start.getMonth() + 1 + "/" + start.getDate(),
        active: Math.round((520 + rnd() * 120) * growth),
        solves: Math.round((260 + rnd() * 90) * growth),
        completions: Math.round((210 + rnd() * 70) * growth),
      };
    });
    const funnel = [
      { label: "註冊", value: 2147 },
      { label: "開始第一堂課", value: 1624 },
      { label: "完成一堂課", value: 1188 },
      { label: "解出第一題", value: 937 },
    ];
    const kpi = { registered: funnel[0].value, monthlyActive: 812, completionRate: 0.52, schools: 21 };
    const tracks = [...s.tracks]
      .filter((t) => t.status === "published")
      .sort((a, b) => a.sortOrder - b.sortOrder)
      .map((t) => {
        const lessons = s.lessons.filter((l) => l.trackId === t.id && l.status === "published").length;
        const learners = Math.round(320 + rnd() * 900);
        const rate = 0.35 + rnd() * 0.45;
        return { id: t.id, name: t.name, color: t.color, lessons, learners, completions: Math.round(learners * lessons * rate), rate };
      });
    const categories = (Object.keys(CATEGORY_META) as Category[]).map((cat) => {
      let attempts = 0;
      let solves = 0;
      for (const c of s.challenges.filter((x) => x.category === cat && x.status === "published")) {
        attempts += Math.round(c.baseSolves * DIFF_FACTOR[c.difficulty]);
        solves += c.baseSolves;
      }
      return { category: cat, label: CATEGORY_META[cat].label, color: CATEGORY_META[cat].color, attempts, solves, rate: attempts ? solves / attempts : 0 };
    });
    const bySchool = new Map<string, { members: number; xp: number; solves: number }>();
    for (const u of s.users) {
      if (!u.schoolId) continue;
      const e = bySchool.get(u.schoolId) ?? { members: 0, xp: 0, solves: 0 };
      e.members += 1;
      e.xp += u.xp;
      e.solves += u.solves;
      bySchool.set(u.schoolId, e);
    }
    const schools = [...bySchool.entries()]
      .map(([schoolId, e]) => ({ schoolId, school: schoolById(schoolId)?.short ?? schoolId, ...e }))
      .sort((a, b) => b.xp - a.xp)
      .slice(0, 10);
    const dropoff = s.lessons
      .filter((l) => l.status === "published")
      .map((l) => {
        const started = Math.round(200 + rnd() * 600);
        const rate = 0.3 + rnd() * 0.6;
        return { id: l.id, title: l.title, track: s.tracks.find((t) => t.id === l.trackId)?.name ?? "", started, completed: Math.round(started * rate), rate };
      })
      .sort((a, b) => a.rate - b.rate)
      .slice(0, 6);
    return { generatedAt: now(), weeks, funnel, kpi, tracks, categories, schools, dropoff };
  },

  tracks: {
    async list() {
      return [...store().tracks].sort((a, b) => a.sortOrder - b.sortOrder);
    },
    async save(track) {
      await delay();
      const s = store();
      const exists = s.tracks.some((t) => t.id === track.id);
      const next = exists ? s.tracks.map((t) => (t.id === track.id ? track : t)) : [...s.tracks, track];
      s.set("tracks", next);
      log("save", "track", track.id, track.name);
      return track;
    },
    async remove(id) {
      const s = store();
      const name = s.tracks.find((t) => t.id === id)?.name ?? id;
      s.set("tracks", s.tracks.filter((t) => t.id !== id));
      s.set("lessons", s.lessons.filter((l) => l.trackId !== id));
      log("delete", "track", id, name);
    },
  },

  lessons: {
    async list() {
      return [...store().lessons];
    },
    async save(lesson) {
      await delay();
      const s = store();
      const saved = { ...lesson, updatedAt: now() };
      const exists = s.lessons.some((l) => l.id === lesson.id);
      s.set("lessons", exists ? s.lessons.map((l) => (l.id === lesson.id ? saved : l)) : [...s.lessons, saved]);
      log("save", "lesson", lesson.id, lesson.title);
      return saved;
    },
    async remove(id) {
      const s = store();
      const title = s.lessons.find((l) => l.id === id)?.title ?? id;
      s.set("lessons", s.lessons.filter((l) => l.id !== id));
      log("delete", "lesson", id, title);
    },
    async reorder(moduleId, ids) {
      const s = store();
      s.set(
        "lessons",
        s.lessons.map((l) => (l.moduleId === moduleId && ids.includes(l.id) ? { ...l, sortOrder: ids.indexOf(l.id) } : l)),
      );
      log("reorder", "lesson", moduleId, "調整章節內順序");
    },
  },

  challenges: {
    async list() {
      return [...store().challenges];
    },
    async save(challenge) {
      await delay();
      const s = store();
      // plaintext never leaves the editor
      const saved: AdminChallenge = {
        ...challenge,
        flags: challenge.flags.map((f) => {
          const copy = { ...f };
          delete copy.plaintext;
          return copy;
        }),
        updatedAt: now(),
      };
      const exists = s.challenges.some((c) => c.id === challenge.id);
      s.set("challenges", exists ? s.challenges.map((c) => (c.id === challenge.id ? saved : c)) : [...s.challenges, saved]);
      log("save", "challenge", challenge.id, challenge.name);
      return saved;
    },
    async remove(id) {
      const s = store();
      const name = s.challenges.find((c) => c.id === id)?.name ?? id;
      s.set("challenges", s.challenges.filter((c) => c.id !== id));
      log("delete", "challenge", id, name);
    },
  },

  events: {
    async list() {
      return [...store().events].sort((a, b) => a.startsAt.localeCompare(b.startsAt));
    },
    async save(event) {
      await delay();
      const s = store();
      const exists = s.events.some((e) => e.id === event.id);
      s.set("events", exists ? s.events.map((e) => (e.id === event.id ? event : e)) : [...s.events, event]);
      log("save", "event", event.id, event.title);
      return event;
    },
    async remove(id) {
      const s = store();
      const title = s.events.find((e) => e.id === id)?.title ?? id;
      s.set("events", s.events.filter((e) => e.id !== id));
      log("delete", "event", id, title);
    },
  },

  instructors: {
    async list() {
      return [...store().instructors].sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name));
    },
    async save(instructor) {
      await delay();
      const s = store();
      const exists = s.instructors.some((i) => i.id === instructor.id);
      s.set("instructors", exists ? s.instructors.map((i) => (i.id === instructor.id ? instructor : i)) : [...s.instructors, instructor]);
      log("save", "instructor", instructor.id, instructor.name);
      return instructor;
    },
    async remove(id) {
      const s = store();
      const name = s.instructors.find((i) => i.id === id)?.name ?? id;
      s.set("instructors", s.instructors.filter((i) => i.id !== id));
      s.set("tracks", s.tracks.map((t) => (t.instructorId === id ? { ...t, instructorId: null } : t)));
      s.set("challenges", s.challenges.map((c) => (c.authorId === id ? { ...c, authorId: null } : c)));
      s.set("events", s.events.map((e) => (e.hostId === id ? { ...e, hostId: null } : e)));
      log("delete", "instructor", id, name);
    },
  },

  users: {
    async list() {
      return [...store().users].sort((a, b) => b.xp - a.xp);
    },
    async detail(id) {
      await delay(80);
      const s = store();
      const user = s.users.find((u) => u.id === id);
      if (!user) throw new Error("找不到這個帳號");
      const rnd = seeded(hashStr(id));
      const pool = s.challenges.filter((c) => c.status === "published");
      const solves = Array.from({ length: Math.min(user.solves, 30) }, (_, i) => {
        const c = pool[Math.floor(rnd() * pool.length)];
        return { slug: c.slug, name: c.name, points: c.flags.reduce((n, f) => n + f.points, 0), at: daysAgo(i * 2 + rnd() * 2) };
      });
      const lessons = s.lessons
        .filter((l) => l.status === "published")
        .slice(0, 8)
        .map((l, i) => {
          const watched = i < 3 ? 1 : Math.round(rnd() * 90) / 100;
          return { title: l.title, track: s.tracks.find((t) => t.id === l.trackId)?.name ?? "", watched, completed: watched >= 1 };
        });
      const synthetic: XpEntry[] = [
        ...solves.map((sv, i) => ({ id: "s" + i, delta: sv.points, reason: "solve" as const, label: "解出 " + sv.name, at: sv.at })),
        ...lessons.filter((l) => l.completed).map((l, i) => ({ id: "l" + i, delta: 80, reason: "lesson" as const, label: "完成 " + l.title, at: daysAgo(10 + i * 3) })),
      ];
      const ledger = [...(s.ledger[id] ?? []), ...synthetic].sort((a, b) => b.at.localeCompare(a.at));
      return {
        user,
        joinedAt: daysAgo(120 + rnd() * 200),
        ledger,
        solves,
        lessons,
        questions: s.questions.filter((q) => q.authorHandle === user.handle).length,
      };
    },
    async setRole(id, role) {
      const s = store();
      const u = s.users.find((x) => x.id === id);
      s.set("users", s.users.map((x) => (x.id === id ? { ...x, role } : x)));
      log("role", "user", id, (u?.handle ?? id) + " 角色改為 " + role);
    },
    async setBanned(id, banned) {
      const s = store();
      const u = s.users.find((x) => x.id === id);
      s.set("users", s.users.map((x) => (x.id === id ? { ...x, bannedAt: banned ? now() : null } : x)));
      log(banned ? "ban" : "unban", "user", id, (u?.handle ?? id) + (banned ? " 停權" : " 解除停權"));
    },
    async adjustXp(id, delta, reason) {
      await delay();
      const s = store();
      const u = s.users.find((x) => x.id === id);
      if (!u) throw new Error("找不到這個帳號");
      const xp = Math.max(0, u.xp + delta);
      s.set("users", s.users.map((x) => (x.id === id ? { ...x, xp } : x)));
      const entry: XpEntry = { id: nanoid(8), delta, reason: "admin", label: reason, at: now() };
      s.set("ledger", { ...s.ledger, [id]: [entry, ...(s.ledger[id] ?? [])] });
      log("xp", "user", id, u.handle + " " + (delta > 0 ? "+" : "") + delta + " XP · " + reason);
      return xp;
    },
  },

  questions: {
    async list() {
      return [...store().questions].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    },
    async answer(questionId, body, author) {
      const s = store();
      s.set(
        "questions",
        s.questions.map((q) =>
          q.id === questionId
            ? { ...q, answers: [...q.answers, { id: nanoid(8), authorHandle: author.handle, authorRole: author.role, body, createdAt: now(), votes: 0 }] }
            : q,
        ),
      );
      log("answer", "question", questionId, s.questions.find((q) => q.id === questionId)?.title ?? questionId);
    },
    async accept(questionId, answerId) {
      const s = store();
      s.set("questions", s.questions.map((q) => (q.id === questionId ? { ...q, acceptedAnswerId: answerId } : q)));
      log("accept", "question", questionId, s.questions.find((q) => q.id === questionId)?.title ?? questionId);
    },
    async remove(questionId) {
      const s = store();
      const title = s.questions.find((q) => q.id === questionId)?.title ?? questionId;
      s.set("questions", s.questions.filter((q) => q.id !== questionId));
      log("delete", "question", questionId, title);
    },
  },

  instances: {
    async list() {
      return [...store().instances].filter((i) => i.status === "running" || i.status === "starting");
    },
    async kill(id) {
      await delay();
      const s = store();
      const inst = s.instances.find((i) => i.id === id);
      s.set("instances", s.instances.filter((i) => i.id !== id));
      log("kill", "instance", id, inst ? inst.userHandle + " · " + inst.challengeName : id);
    },
    async killAll() {
      await delay();
      const s = store();
      const n = s.instances.length;
      s.set("instances", []);
      log("kill", "instance", null, "全部關閉，共 " + n + " 個");
      return n;
    },
  },

  audit: {
    async list(limit = 200) {
      return [...store().audit].sort((a, b) => b.at.localeCompare(a.at)).slice(0, limit);
    },
  },

  settings: {
    async get() {
      return store().settings;
    },
    async save(settings) {
      await delay();
      store().set("settings", settings);
      log("settings", "settings", null, "更新站點設定");
      return settings;
    },
  },

  uploads: {
    async video(lessonId) {
      await delay(200);
      return { mode: "mock", id: "mock-" + lessonId + "-" + nanoid(6) };
    },
    async file(challengeId, file) {
      await delay(200);
      return { mode: "mock", id: nanoid(8), objectKey: "challenges/" + challengeId + "/" + file.name };
    },
    async videoStatus() {
      await delay(600);
      return "ready";
    },
  },

  async importCtfd(payload) {
    // CTFd export: { challenges: [{ name, category, value, description, flags: [{content}], hints: [{content, cost}] }] }
    const list = (payload as { challenges?: unknown[] })?.challenges;
    if (!Array.isArray(list)) throw new Error("看不懂這個檔案，需要 CTFd 匯出的 JSON。");
    const s = store();
    let imported = 0;
    let skipped = 0;
    const next = [...s.challenges];
    for (const raw of list as Record<string, unknown>[]) {
      const name = String(raw.name ?? "");
      if (!name) {
        skipped++;
        continue;
      }
      const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
      if (next.some((c) => c.slug === slug)) {
        skipped++;
        continue;
      }
      const cat = String(raw.category ?? "misc").toLowerCase();
      next.push({
        id: nanoid(12),
        slug,
        name,
        category: (["web", "crypto", "reverse", "pwn", "linux", "misc"].includes(cat) ? cat : "misc") as AdminChallenge["category"],
        difficulty: "medium",
        kind: "challenge",
        blurb: "",
        description: String(raw.description ?? "").split("\n").filter(Boolean),
        tags: [],
        authorId: null,
        tutorial: false,
        lessonRef: null,
        connectionType: "none",
        connectionValue: null,
        instanceImage: null,
        instancePort: null,
        instanceTtlMin: 120,
        baseSolves: 0,
        rating: 0,
        status: "draft",
        releasedAt: null,
        flags: [{ id: nanoid(8), flagId: "flag", label: "Flag", sha256: "", points: Number(raw.value ?? 100), plaintext: String((raw.flags as { content?: string }[] | undefined)?.[0]?.content ?? "") }],
        hints: ((raw.hints as { content?: string; cost?: number }[] | undefined) ?? []).map((h) => ({ id: nanoid(8), text: String(h.content ?? ""), cost: Number(h.cost ?? 10) })),
        files: [],
        updatedAt: now(),
      });
      imported++;
    }
    s.set("challenges", next);
    log("import", "challenge", null, "CTFd 匯入 " + imported + " 題，略過 " + skipped + " 題");
    return { imported, skipped };
  },

  async exportAll() {
    const s = store();
    return { exportedAt: now(), tracks: s.tracks, lessons: s.lessons, challenges: s.challenges, events: s.events, instructors: s.instructors, settings: s.settings };
  },
};

/* ------------------------------------------------------------------ */
/* http adapter — see docs/API.md                                       */
/* ------------------------------------------------------------------ */
async function http<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch("/api/admin" + path, {
    ...init,
    headers: { "content-type": "application/json", ...(init?.headers ?? {}) },
    credentials: "same-origin",
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error("API " + res.status + ": " + (text || res.statusText));
  }
  return (res.status === 204 ? undefined : await res.json()) as T;
}
const json = (body: unknown) => JSON.stringify(body);

export const httpApi: AdminApi = {
  mode: "http",
  stats: () => http("/stats"),
  status: () => http("/status"),
  analytics: () => http("/analytics"),
  tracks: {
    list: () => http("/tracks"),
    save: (t) => http("/tracks/" + t.id, { method: "PUT", body: json(t) }),
    remove: (id) => http("/tracks/" + id, { method: "DELETE" }),
  },
  lessons: {
    list: () => http("/lessons"),
    save: (l) => http("/lessons/" + l.id, { method: "PUT", body: json(l) }),
    remove: (id) => http("/lessons/" + id, { method: "DELETE" }),
    reorder: (moduleId, ids) => http("/lessons/reorder", { method: "POST", body: json({ moduleId, ids }) }),
  },
  challenges: {
    list: () => http("/challenges"),
    save: (c) => http("/challenges/" + c.id, { method: "PUT", body: json(c) }),
    remove: (id) => http("/challenges/" + id, { method: "DELETE" }),
  },
  events: {
    list: () => http("/events"),
    save: (e) => http("/events/" + e.id, { method: "PUT", body: json(e) }),
    remove: (id) => http("/events/" + id, { method: "DELETE" }),
  },
  instructors: {
    list: () => http("/instructors"),
    save: (i) => http("/instructors/" + i.id, { method: "PUT", body: json(i) }),
    remove: (id) => http("/instructors/" + id, { method: "DELETE" }),
  },
  users: {
    list: () => http("/users"),
    detail: (id) => http("/users/" + id),
    setRole: (id, role) => http("/users/" + id, { method: "PATCH", body: json({ role }) }),
    setBanned: (id, banned) => http("/users/" + id, { method: "PATCH", body: json({ banned }) }),
    adjustXp: (id, delta, reason) => http<{ xp: number }>("/users/" + id + "/xp", { method: "POST", body: json({ delta, reason }) }).then((r) => r.xp),
  },
  questions: {
    list: () => http("/questions"),
    answer: (id, body) => http("/questions/" + id + "/answers", { method: "POST", body: json({ body }) }),
    accept: (id, answerId) => http("/questions/" + id, { method: "PATCH", body: json({ acceptedAnswerId: answerId }) }),
    remove: (id) => http("/questions/" + id, { method: "DELETE" }),
  },
  instances: {
    list: () => http("/instances"),
    kill: (id) => http("/instances/" + id, { method: "DELETE" }),
    killAll: () => http<{ stopped: number }>("/instances", { method: "DELETE" }).then((r) => r.stopped),
  },
  audit: {
    list: (limit = 200) => http("/audit?limit=" + limit),
  },
  settings: {
    get: () => http("/settings"),
    save: (s) => http("/settings", { method: "PUT", body: json(s) }),
  },
  uploads: {
    video: (lessonId, file) => http("/uploads/video", { method: "POST", body: json({ lessonId, ...file }) }),
    file: (challengeId, file) => http("/uploads/file", { method: "POST", body: json({ challengeId, ...file }) }),
    videoStatus: (videoId) => http<{ status: VideoStatus }>("/uploads/video/" + videoId).then((r) => r.status),
  },
  importCtfd: (payload) => http("/import/ctfd", { method: "POST", body: json(payload) }),
  exportAll: () => http("/export"),
};

/** The console talks to the database unless NEXT_PUBLIC_ADMIN_API=local is set. */
export function getAdminApi(): AdminApi {
  return process.env.NEXT_PUBLIC_ADMIN_API === "local" ? localApi : httpApi;
}

export { buildSeed };
