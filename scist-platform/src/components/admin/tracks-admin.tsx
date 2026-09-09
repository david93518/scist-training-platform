"use client";

import Link from "next/link";
import { ArrowDown, ArrowUp, Plus, Pencil } from "lucide-react";
import { getAdminApi } from "@/admin/api";
import { Icon } from "@/components/ui/icon";
import { buttonClass, DifficultyBadge } from "@/components/ui/primitives";
import { PageTitle, StatusBadge, ToastHost, useAsync, useToast } from "@/components/admin/ui";
import type { AdminTrack } from "@/admin/types";

export function TracksAdmin() {
  const api = getAdminApi();
  const toast = useToast((s) => s.push);
  const tracks = useAsync(() => api.tracks.list());
  const lessons = useAsync(() => api.lessons.list());

  const move = async (t: AdminTrack, d: -1 | 1) => {
    const list = tracks.data ?? [];
    const i = list.findIndex((x) => x.id === t.id);
    const j = i + d;
    if (j < 0 || j >= list.length) return;
    const a = { ...list[i], sortOrder: j };
    const b = { ...list[j], sortOrder: i };
    await api.tracks.save(a);
    await api.tracks.save(b);
    await tracks.reload();
    toast("順序已更新");
  };

  return (
    <div>
      <PageTitle
        kicker="TRACKS"
        title="學習路徑"
        desc="五大領域加程式基礎。這裡管名稱、顏色、大綱與章節；課程本身在「課程與影片」上架。"
        actions={
          <Link href="/admin/tracks/new" className={buttonClass("primary", "sm")}>
            <Plus size={14} />
            新增路徑
          </Link>
        }
      />

      <div className="flex flex-col gap-3">
        {(tracks.data ?? []).map((t, i, arr) => {
          const count = (lessons.data ?? []).filter((l) => l.trackId === t.id).length;
          const published = (lessons.data ?? []).filter((l) => l.trackId === t.id && l.status === "published").length;
          return (
            <div key={t.id} className="card relative flex flex-wrap items-center gap-5 overflow-hidden p-5">
              <span className="absolute inset-y-0 left-0 w-[3px]" style={{ background: t.color }} />
              <span className="clip-hex grid h-12 w-12 shrink-0 place-items-center" style={{ background: t.color + "22" }}>
                <Icon name={t.icon} size={20} style={{ color: t.color }} />
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2.5">
                  <span className="text-[16px] font-extrabold">{t.name}</span>
                  <span className="font-mono text-[11px] tracking-widest" style={{ color: t.color }}>
                    {t.en.toUpperCase()}
                  </span>
                  <StatusBadge status={t.status} />
                </div>
                <div className="mt-1 text-[13px] text-fg-2">{t.tagline}</div>
                <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 font-mono text-[11.5px] text-fg-3">
                  <DifficultyBadge level={t.difficulty} />
                  <span>{t.modules.length} 章</span>
                  <span>
                    {published}/{count} 課已發布
                  </span>
                  <span>/learn/{t.slug}</span>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <button onClick={() => move(t, -1)} disabled={i === 0} className="rounded-md p-2 text-fg-3 hover:bg-white/[0.06] hover:text-fg disabled:opacity-30" aria-label="上移">
                  <ArrowUp size={14} />
                </button>
                <button onClick={() => move(t, 1)} disabled={i === arr.length - 1} className="rounded-md p-2 text-fg-3 hover:bg-white/[0.06] hover:text-fg disabled:opacity-30" aria-label="下移">
                  <ArrowDown size={14} />
                </button>
                <Link href={"/admin/tracks/" + t.id} className={buttonClass("outline", "sm", "ml-2")}>
                  <Pencil size={13} />
                  編輯
                </Link>
              </div>
            </div>
          );
        })}
      </div>
      <ToastHost />
    </div>
  );
}
