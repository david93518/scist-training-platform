"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { RefreshCw, Search } from "lucide-react";
import { getAdminApi } from "@/admin/api";
import type { AuditAction } from "@/admin/types";
import { Button, HexAvatar } from "@/components/ui/primitives";
import { EmptyState, PageTitle, Table, Td, Th, Tr, ToastHost, useAsync } from "@/components/admin/ui";
import { cn, formatDateTime, relativeTime } from "@/lib/utils";
import { useNow } from "@/lib/use-now";

const ENTITY: Record<string, string> = {
  lesson: "課程",
  challenge: "題目",
  track: "路徑",
  event: "活動",
  instructor: "講師",
  user: "學員",
  question: "問答",
  instance: "靶機",
  settings: "設定",
};

const ACTION: Record<AuditAction, { label: string; color: string }> = {
  save: { label: "儲存", color: "#a4f13b" },
  delete: { label: "刪除", color: "#ff5e5e" },
  role: { label: "改角色", color: "#4da3ff" },
  ban: { label: "停權", color: "#ff5e5e" },
  unban: { label: "解除停權", color: "#a4f13b" },
  xp: { label: "調整 XP", color: "#ffb84d" },
  kill: { label: "關閉環境", color: "#ffb84d" },
  import: { label: "匯入", color: "#b983ff" },
  settings: { label: "設定", color: "#4da3ff" },
  answer: { label: "回答", color: "#4da3ff" },
  accept: { label: "採納", color: "#a4f13b" },
  reorder: { label: "排序", color: "#6b7a8e" },
  password: { label: "重設密碼", color: "#b983ff" },
};

function hrefFor(entity: string, id: string | null) {
  if (!id) return null;
  switch (entity) {
    case "lesson":
      return "/admin/lessons/" + id;
    case "challenge":
      return "/admin/challenges/" + id;
    case "track":
      return "/admin/tracks/" + id;
    case "user":
      return "/admin/users?u=" + id;
    case "instructor":
      return "/admin/instructors?edit=" + id;
    case "event":
      return "/admin/events";
    case "question":
      return "/admin/questions";
    case "instance":
      return "/admin/instances";
    default:
      return null;
  }
}

export function AuditAdmin() {
  const api = getAdminApi();
  const log = useAsync(() => api.audit.list(300));
  const now = useNow(60_000);
  const [entity, setEntity] = useState<string>("all");
  const [q, setQ] = useState("");

  const visible = useMemo(() => {
    let l = log.data ?? [];
    if (entity !== "all") l = l.filter((e) => e.entity === entity);
    if (q) l = l.filter((e) => (e.actorHandle + " " + e.label + " " + (e.entityId ?? "")).toLowerCase().includes(q.toLowerCase()));
    return l;
  }, [log.data, entity, q]);

  const entities = ["all", ...Object.keys(ENTITY).filter((k) => (log.data ?? []).some((e) => e.entity === k))];

  return (
    <div>
      <PageTitle
        kicker="AUDIT LOG"
        title="操作紀錄"
        desc="誰在什麼時候改了什麼。內容、角色、XP、靶機的變更都會留下一筆，出事的時候從這裡回推。"
        actions={
          <Button variant="outline" size="sm" onClick={() => log.reload()}>
            <RefreshCw size={13} className={log.loading ? "animate-spin" : ""} />
            重新整理
          </Button>
        }
      />

      <div className="mb-5 flex flex-wrap items-center gap-3">
        <div className="flex h-10 min-w-[220px] flex-1 items-center gap-2 rounded-lg border border-white/[0.08] bg-bg-0 px-3">
          <Search size={14} className="text-fg-3" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="搜尋操作者、說明、ID" className="w-full bg-transparent text-[13.5px] outline-none placeholder:text-fg-3" />
        </div>
        <div className="flex gap-1 overflow-x-auto no-scrollbar">
          {entities.map((k) => (
            <button
              key={k}
              onClick={() => setEntity(k)}
              className={cn("shrink-0 rounded-lg border px-3 py-1.5 text-[12.5px] font-bold", entity === k ? "border-white/20 bg-white/[0.08]" : "border-white/[0.08] text-fg-2")}
            >
              {k === "all" ? "全部" : ENTITY[k]}
            </button>
          ))}
        </div>
      </div>

      {visible.length === 0 && !log.loading ? (
        <EmptyState title="還沒有紀錄" desc={api.mode === "local" ? "在後台改一點東西，這裡就會出現。" : "後台的每個變更都會寫進 audit_log。"} />
      ) : (
        <Table>
          <thead>
            <tr>
              <Th>時間</Th>
              <Th>操作者</Th>
              <Th>動作</Th>
              <Th>對象</Th>
              <Th>說明</Th>
            </tr>
          </thead>
          <tbody>
            {visible.map((e) => {
              const a = ACTION[e.action] ?? { label: e.action, color: "#6b7a8e" };
              const href = hrefFor(e.entity, e.entityId);
              return (
                <Tr key={e.id}>
                  <Td>
                    <div className="font-mono text-[12px]">{relativeTime(e.at, now)}</div>
                    <div className="font-mono text-[10.5px] text-fg-3">{formatDateTime(e.at)}</div>
                  </Td>
                  <Td>
                    <span className="flex items-center gap-2 font-mono text-[12.5px] font-bold">
                      <HexAvatar seed={e.actorHandle} size={24} />
                      {e.actorHandle}
                    </span>
                  </Td>
                  <Td>
                    <span className="inline-flex items-center rounded-md border px-2 py-0.5 font-mono text-[10.5px] tracking-wider" style={{ color: a.color, borderColor: a.color + "55", background: a.color + "14" }}>
                      {a.label}
                    </span>
                  </Td>
                  <Td>
                    <span className="text-[12.5px] text-fg-2">{ENTITY[e.entity] ?? e.entity}</span>
                    {e.entityId ? (
                      href ? (
                        <Link href={href} className="ml-2 font-mono text-[11px] text-fg-3 hover:text-accent">
                          {e.entityId}
                        </Link>
                      ) : (
                        <span className="ml-2 font-mono text-[11px] text-fg-3">{e.entityId}</span>
                      )
                    ) : null}
                  </Td>
                  <Td className="max-w-[360px] truncate text-[13px]">{e.label}</Td>
                </Tr>
              );
            })}
          </tbody>
        </Table>
      )}

      <p className="mt-4 font-mono text-[11.5px] text-fg-3">
        {api.mode === "local" ? "本機模式：只記錄這台瀏覽器上的操作，最多保留 500 筆。" : "資料庫的 audit_log 表；這裡顯示最近 300 筆。"}
      </p>
      <ToastHost />
    </div>
  );
}
