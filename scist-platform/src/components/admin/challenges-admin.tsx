"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Pencil, Plus, Search, Server, Upload } from "lucide-react";
import { getAdminApi } from "@/admin/api";
import type { Status } from "@/admin/types";
import { CATEGORY_META, type Category } from "@/data/challenges";
import { Icon } from "@/components/ui/icon";
import { buttonClass, DifficultyBadge } from "@/components/ui/primitives";
import { PageTitle, StatusBadge, Table, Td, Th, Tr, ToastHost, useAsync } from "@/components/admin/ui";
import { cn, formatDate } from "@/lib/utils";

export function ChallengesAdmin() {
  const api = getAdminApi();
  const list = useAsync(() => api.challenges.list());
  const [cat, setCat] = useState<Category | "all">("all");
  const [status, setStatus] = useState<Status | "all">("all");
  const [q, setQ] = useState("");

  const visible = useMemo(() => {
    let l = list.data ?? [];
    if (cat !== "all") l = l.filter((c) => c.category === cat);
    if (status !== "all") l = l.filter((c) => c.status === status);
    if (q) l = l.filter((c) => (c.name + c.slug + c.tags.join(" ")).toLowerCase().includes(q.toLowerCase()));
    return [...l].sort((a, b) => (b.releasedAt ?? "").localeCompare(a.releasedAt ?? ""));
  }, [list.data, cat, status, q]);

  const total = list.data?.length ?? 0;
  const published = list.data?.filter((c) => c.status === "published").length ?? 0;

  return (
    <div>
      <PageTitle
        kicker="ARENA"
        title="題庫"
        desc={<>共 {total} 題，{published} 題已發布。Flag 存的是 SHA-256，這裡看不到明文；提示會扣 XP；靶機類題目需要設定 Docker 映像。</>}
        actions={
          <>
            <Link href="/admin/settings#import" className={buttonClass("outline", "sm")}>
              <Upload size={14} />
              匯入 CTFd
            </Link>
            <Link href="/admin/challenges/new" className={buttonClass("primary", "sm")}>
              <Plus size={14} />
              新增題目
            </Link>
          </>
        }
      />

      <div className="mb-5 flex flex-wrap items-center gap-3">
        <div className="flex h-10 min-w-[220px] flex-1 items-center gap-2 rounded-lg border border-white/[0.08] bg-bg-0 px-3">
          <Search size={14} className="text-fg-3" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="搜尋題名、代稱、標籤" className="w-full bg-transparent text-[13.5px] outline-none placeholder:text-fg-3" />
        </div>
        <div className="flex gap-1 overflow-x-auto no-scrollbar">
          <button onClick={() => setCat("all")} className={cn("shrink-0 rounded-lg border px-3 py-1.5 text-[12.5px] font-bold", cat === "all" ? "border-white/20 bg-white/[0.08]" : "border-white/[0.08] text-fg-2")}>
            全部
          </button>
          {(Object.keys(CATEGORY_META) as Category[]).map((c) => {
            const m = CATEGORY_META[c];
            return (
              <button
                key={c}
                onClick={() => setCat(c)}
                className={cn("flex shrink-0 items-center gap-1.5 rounded-lg border px-3 py-1.5 text-[12.5px] font-bold", cat === c ? "border-white/20 bg-white/[0.08]" : "border-white/[0.08] text-fg-2")}
              >
                <Icon name={m.icon} size={12} style={{ color: m.color }} />
                {m.label}
              </button>
            );
          })}
        </div>
        <div className="flex rounded-lg border border-white/[0.08] bg-bg-0 p-0.5">
          {(["all", "published", "draft", "archived"] as const).map((s) => (
            <button key={s} onClick={() => setStatus(s)} className={cn("rounded-md px-2.5 py-1 text-[12px] font-bold", status === s ? "bg-white/[0.1] text-fg" : "text-fg-3")}>
              {s === "all" ? "全部" : s === "published" ? "已發布" : s === "draft" ? "草稿" : "封存"}
            </button>
          ))}
        </div>
      </div>

      <Table>
        <thead>
          <tr>
            <Th>題目</Th>
            <Th>類別</Th>
            <Th>難度</Th>
            <Th>分數</Th>
            <Th>Flag / 提示</Th>
            <Th>環境</Th>
            <Th>解題</Th>
            <Th>狀態</Th>
            <Th>上線</Th>
            <Th className="text-right">操作</Th>
          </tr>
        </thead>
        <tbody>
          {visible.map((c) => {
            const m = CATEGORY_META[c.category];
            const points = c.flags.reduce((n, f) => n + f.points, 0);
            return (
              <Tr key={c.id}>
                <Td>
                  <Link href={"/admin/challenges/" + c.id} className="flex items-center gap-2 font-bold hover:text-accent">
                    {c.name}
                    {c.kind === "box" ? (
                      <span className="flex items-center gap-1 rounded border border-purple/40 bg-purple/10 px-1.5 py-px font-mono text-[9.5px] text-purple">
                        <Server size={9} /> BOX
                      </span>
                    ) : null}
                    {c.tutorial ? <span className="rounded border border-accent/40 bg-accent/10 px-1.5 py-px font-mono text-[9.5px] text-accent">TUTORIAL</span> : null}
                  </Link>
                  <div className="font-mono text-[11px] text-fg-3">/{c.slug}</div>
                </Td>
                <Td>
                  <span className="flex items-center gap-1.5 text-[12.5px]" style={{ color: m.color }}>
                    <Icon name={m.icon} size={13} />
                    {m.label}
                  </span>
                </Td>
                <Td>
                  <DifficultyBadge level={c.difficulty} />
                </Td>
                <Td className="font-mono font-bold">{points}</Td>
                <Td className="font-mono text-[12px] text-fg-2">
                  {c.flags.length} / {c.hints.length}
                </Td>
                <Td className="font-mono text-[11.5px] text-fg-3">
                  {c.connectionType === "none" ? (c.files.length ? c.files.length + " 附件" : "—") : c.connectionType.toUpperCase() + (c.instanceImage ? " · docker" : "")}
                </Td>
                <Td className="font-mono text-[12px]">{c.baseSolves}</Td>
                <Td>
                  <StatusBadge status={c.status} />
                </Td>
                <Td className="font-mono text-[11.5px] text-fg-3">{c.releasedAt ? formatDate(c.releasedAt) : "—"}</Td>
                <Td>
                  <div className="flex justify-end">
                    <Link href={"/admin/challenges/" + c.id} className="rounded-md p-1.5 text-fg-2 hover:bg-white/[0.06] hover:text-fg" aria-label="編輯">
                      <Pencil size={13} />
                    </Link>
                  </div>
                </Td>
              </Tr>
            );
          })}
        </tbody>
      </Table>
      {visible.length === 0 && !list.loading ? <p className="py-10 text-center text-[13px] text-fg-3">沒有符合的題目。</p> : null}
      <ToastHost />
    </div>
  );
}
