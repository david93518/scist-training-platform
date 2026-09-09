"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { ArrowDown, ArrowUp, Pencil, Plus, Search, Video, VideoOff, Clapperboard, ListChecks, Zap } from "lucide-react";
import { getAdminApi } from "@/admin/api";
import type { AdminLesson, Status } from "@/admin/types";
import { Icon } from "@/components/ui/icon";
import { buttonClass } from "@/components/ui/primitives";
import { PageTitle, StatusBadge, Table, Td, Th, Tr, ToastHost, useAsync, useToast } from "@/components/admin/ui";
import { cn, relativeTime } from "@/lib/utils";
import { useNow } from "@/lib/use-now";

const VIDEO_ICON = {
  none: { Icon: VideoOff, label: "無影片", color: "#6b7a8e" },
  youtube: { Icon: Video, label: "YouTube", color: "#ff5e5e" },
  stream: { Icon: Clapperboard, label: "Stream", color: "#ffb84d" },
} as const;

export function LessonsAdmin() {
  const api = getAdminApi();
  const toast = useToast((s) => s.push);
  const tracks = useAsync(() => api.tracks.list());
  const lessons = useAsync(() => api.lessons.list());
  const now = useNow(60_000);

  const [trackId, setTrackId] = useState<string>("all");
  const [status, setStatus] = useState<Status | "all">("all");
  const [q, setQ] = useState("");

  const visible = useMemo(() => {
    let list = lessons.data ?? [];
    if (trackId !== "all") list = list.filter((l) => l.trackId === trackId);
    if (status !== "all") list = list.filter((l) => l.status === status);
    if (q) list = list.filter((l) => (l.title + l.slug + l.summary).toLowerCase().includes(q.toLowerCase()));
    return list;
  }, [lessons.data, trackId, status, q]);

  const grouped = useMemo(() => {
    const byTrack = new Map<string, Map<string, AdminLesson[]>>();
    for (const l of visible) {
      if (!byTrack.has(l.trackId)) byTrack.set(l.trackId, new Map());
      const mods = byTrack.get(l.trackId)!;
      if (!mods.has(l.moduleId)) mods.set(l.moduleId, []);
      mods.get(l.moduleId)!.push(l);
    }
    for (const mods of byTrack.values()) for (const arr of mods.values()) arr.sort((a, b) => a.sortOrder - b.sortOrder);
    return byTrack;
  }, [visible]);

  const move = async (l: AdminLesson, d: -1 | 1) => {
    const siblings = (lessons.data ?? []).filter((x) => x.moduleId === l.moduleId).sort((a, b) => a.sortOrder - b.sortOrder);
    const i = siblings.findIndex((x) => x.id === l.id);
    const j = i + d;
    if (j < 0 || j >= siblings.length) return;
    const ids = siblings.map((x) => x.id);
    [ids[i], ids[j]] = [ids[j], ids[i]];
    await api.lessons.reorder(l.moduleId, ids);
    await lessons.reload();
  };

  const toggle = async (l: AdminLesson) => {
    await api.lessons.save({ ...l, status: l.status === "published" ? "draft" : "published" });
    await lessons.reload();
    toast(l.status === "published" ? "已改為草稿" : "已發布");
  };

  const total = lessons.data?.length ?? 0;
  const published = lessons.data?.filter((l) => l.status === "published").length ?? 0;
  const withVideo = lessons.data?.filter((l) => l.videoProvider !== "none").length ?? 0;

  return (
    <div>
      <PageTitle
        kicker="LESSONS"
        title="課程與影片"
        desc={
          <>
            共 {total} 課，{published} 課已發布，{withVideo} 課有影片。上架一堂課的順序是：填基本資料 → 放影片 → 寫內容 → 設檢查站 → 發布。
          </>
        }
        actions={
          <Link href="/admin/lessons/new" className={buttonClass("primary", "sm")}>
            <Plus size={14} />
            上架課程
          </Link>
        }
      />

      <div className="mb-5 flex flex-wrap items-center gap-3">
        <div className="flex h-10 min-w-[220px] flex-1 items-center gap-2 rounded-lg border border-white/[0.08] bg-bg-0 px-3">
          <Search size={14} className="text-fg-3" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="搜尋課名、代稱" className="w-full bg-transparent text-[13.5px] outline-none placeholder:text-fg-3" />
        </div>
        <div className="flex gap-1 overflow-x-auto no-scrollbar">
          {[{ id: "all", name: "全部", color: "#a9b6c6" }, ...(tracks.data ?? [])].map((t) => (
            <button
              key={t.id}
              onClick={() => setTrackId(t.id)}
              className={cn(
                "shrink-0 rounded-lg border px-3 py-1.5 text-[12.5px] font-bold transition-colors",
                trackId === t.id ? "border-white/20 bg-white/[0.08] text-fg" : "border-white/[0.08] text-fg-2 hover:text-fg",
              )}
            >
              {t.name}
            </button>
          ))}
        </div>
        <div className="flex rounded-lg border border-white/[0.08] bg-bg-0 p-0.5">
          {(["all", "published", "draft", "archived"] as const).map((s) => (
            <button
              key={s}
              onClick={() => setStatus(s)}
              className={cn("rounded-md px-2.5 py-1 text-[12px] font-bold", status === s ? "bg-white/[0.1] text-fg" : "text-fg-3")}
            >
              {s === "all" ? "全部" : s === "published" ? "已發布" : s === "draft" ? "草稿" : "封存"}
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-col gap-6">
        {[...grouped.entries()].map(([tid, mods]) => {
          const t = (tracks.data ?? []).find((x) => x.id === tid);
          if (!t) return null;
          return (
            <div key={tid}>
              <div className="mb-3 flex items-center gap-3">
                <span className="clip-hex grid h-8 w-8 place-items-center" style={{ background: t.color + "22" }}>
                  <Icon name={t.icon} size={14} style={{ color: t.color }} />
                </span>
                <span className="text-[15px] font-extrabold">{t.name}</span>
                <span className="font-mono text-[11px] tracking-widest text-fg-3">{t.en.toUpperCase()}</span>
                <Link href={"/admin/tracks/" + t.id} className="ml-auto text-[12px] text-fg-3 hover:text-fg">
                  編輯路徑
                </Link>
              </div>
              <Table>
                <thead>
                  <tr>
                    <Th className="w-10">#</Th>
                    <Th>課程</Th>
                    <Th>影片</Th>
                    <Th>檢查站</Th>
                    <Th>XP</Th>
                    <Th>狀態</Th>
                    <Th>更新</Th>
                    <Th className="text-right">操作</Th>
                  </tr>
                </thead>
                <tbody>
                  {[...mods.entries()].map(([mid, list]) => {
                    const mod = t.modules.find((m) => m.id === mid);
                    return [
                      <tr key={mid + "-head"} className="border-t border-white/[0.06] bg-white/[0.02]">
                        <td colSpan={8} className="px-4 py-2 font-mono text-[10.5px] tracking-widest text-fg-3">
                          {mod?.title ?? mid}
                        </td>
                      </tr>,
                      ...list.map((l, i) => {
                        const v = VIDEO_ICON[l.videoProvider];
                        return (
                          <Tr key={l.id}>
                            <Td className="font-mono text-[12px] text-fg-3">{i + 1}</Td>
                            <Td>
                              <Link href={"/admin/lessons/" + l.id} className="font-bold hover:text-accent">
                                {l.title}
                              </Link>
                              <div className="font-mono text-[11px] text-fg-3">
                                /{t.slug}/{l.slug} · {Math.round(l.durationSec / 60)} 分鐘
                              </div>
                            </Td>
                            <Td>
                              <span className="flex items-center gap-1.5 font-mono text-[11.5px]" style={{ color: v.color }}>
                                <v.Icon size={13} />
                                {v.label}
                                {l.videoProvider !== "none" ? (
                                  <span className={cn("rounded px-1 text-[9.5px]", l.videoStatus === "ready" ? "bg-accent/15 text-accent" : "bg-amber/15 text-amber")}>
                                    {l.videoStatus}
                                  </span>
                                ) : null}
                              </span>
                            </Td>
                            <Td>
                              <span className="flex items-center gap-1 font-mono text-[12px] text-fg-2">
                                <ListChecks size={12} className="text-fg-3" />
                                {l.checkpoints.length}
                              </span>
                            </Td>
                            <Td>
                              <span className="flex items-center gap-1 font-mono text-[12px] text-accent">
                                <Zap size={11} />
                                {l.xp}
                              </span>
                            </Td>
                            <Td>
                              <button onClick={() => toggle(l)} title="切換發布狀態">
                                <StatusBadge status={l.status} />
                              </button>
                            </Td>
                            <Td className="font-mono text-[11.5px] text-fg-3">{relativeTime(l.updatedAt, now)}</Td>
                            <Td>
                              <div className="flex items-center justify-end gap-0.5">
                                <button onClick={() => move(l, -1)} disabled={i === 0} className="rounded-md p-1.5 text-fg-3 hover:bg-white/[0.06] hover:text-fg disabled:opacity-30" aria-label="上移">
                                  <ArrowUp size={13} />
                                </button>
                                <button onClick={() => move(l, 1)} disabled={i === list.length - 1} className="rounded-md p-1.5 text-fg-3 hover:bg-white/[0.06] hover:text-fg disabled:opacity-30" aria-label="下移">
                                  <ArrowDown size={13} />
                                </button>
                                <Link href={"/admin/lessons/" + l.id} className="ml-1 rounded-md p-1.5 text-fg-2 hover:bg-white/[0.06] hover:text-fg" aria-label="編輯">
                                  <Pencil size={13} />
                                </Link>
                              </div>
                            </Td>
                          </Tr>
                        );
                      }),
                    ];
                  })}
                </tbody>
              </Table>
            </div>
          );
        })}
        {visible.length === 0 && !lessons.loading ? <p className="py-10 text-center text-[13px] text-fg-3">沒有符合的課程。</p> : null}
      </div>
      <ToastHost />
    </div>
  );
}
