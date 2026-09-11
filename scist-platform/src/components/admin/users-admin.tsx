"use client";

import { useMemo, useState } from "react";
import { Ban, Eye, Search, ShieldCheck, Undo2 } from "lucide-react";
import { getAdminApi } from "@/admin/api";
import type { Role } from "@/admin/types";
import { schoolById } from "@/data/schools";
import { HexAvatar } from "@/components/ui/primitives";
import { PageTitle, Table, Td, Th, Tr, ToastHost, useAsync, useToast } from "@/components/admin/ui";
import { UserDetailDrawer } from "@/components/admin/user-detail";
import { rankFor } from "@/lib/xp";
import { useRanks } from "@/components/settings-provider";
import { can, ROLE_COLOR, ROLE_LABEL, ROLES } from "@/lib/permissions";
import { useProgress } from "@/store/progress";
import { cn, formatNumber, relativeTime } from "@/lib/utils";
import { useNow } from "@/lib/use-now";

export function UsersAdmin({ initialUserId }: { initialUserId?: string }) {
  const api = getAdminApi();
  const toast = useToast((s) => s.push);
  const users = useAsync(() => api.users.list());
  const now = useNow(60_000);
  const ranks = useRanks();
  const manage = can(useProgress((s) => s.role), "users.manage");
  const [q, setQ] = useState("");
  const [role, setRole] = useState<Role | "all">("all");
  const [selected, setSelected] = useState<string | null>(initialUserId ?? null);

  const visible = useMemo(() => {
    let l = users.data ?? [];
    if (role !== "all") l = l.filter((u) => u.role === role);
    if (q) l = l.filter((u) => (u.handle + " " + (schoolById(u.schoolId ?? "")?.short ?? "")).toLowerCase().includes(q.toLowerCase()));
    return l;
  }, [users.data, q, role]);

  const counts = ROLES.map((r) => ({ r, n: (users.data ?? []).filter((u) => u.role === r).length }));

  // 助教以上、而且真的回答過問題的人
  const helpers = useMemo(
    () =>
      (users.data ?? [])
        .filter((u) => u.role !== "student" && u.answers > 0)
        .sort((a, b) => b.accepted - a.accepted || b.answers - a.answers)
        .slice(0, 9),
    [users.data],
  );

  return (
    <div>
      <PageTitle
        kicker="USERS"
        title="學員與角色"
        desc={
          manage
            ? "註冊後預設是學員。助教可以回答問題與處理靶機，講師可以上架內容，管理員可以改設定、角色與重設密碼。點任何一位看進度、解題與 XP 紀錄。"
            : "註冊後預設是學員。這裡是唯讀的，改角色、停權、調 XP 與重設密碼只有管理員能做。點任何一位看進度、解題與 XP 紀錄。"
        }
      />

      <div className="mb-5 grid gap-3 sm:grid-cols-4">
        {counts.map(({ r, n }) => (
          <button
            key={r}
            onClick={() => setRole(role === r ? "all" : r)}
            className={cn("card flex items-center gap-3 p-4 text-left transition-colors", role === r && "border-accent/50")}
          >
            <span className="clip-hex h-8 w-8" style={{ background: ROLE_COLOR[r] + "33" }} />
            <div>
              <div className="font-mono text-[20px] font-bold leading-none">{n}</div>
              <div className="mt-1 text-[12px] text-fg-3">{ROLE_LABEL[r]}</div>
            </div>
          </button>
        ))}
      </div>

      {helpers.length ? (
        <div className="card mb-5 p-5">
          <div className="mb-1 flex items-center gap-2">
            <ShieldCheck size={15} className="text-blue" />
            <span className="text-[14px] font-bold">助教貢獻</span>
          </div>
          <p className="mb-4 text-[12px] leading-relaxed text-fg-3">
            回答數與被發問者採納的數量，是「累積助教時數可兌換優先報名資深課程」的計算依據。依採納數排序。
          </p>
          <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
            {helpers.map((u) => (
              <button
                key={u.id}
                type="button"
                onClick={() => setSelected(u.id)}
                className="flex items-center gap-3 rounded-xl border border-white/[0.06] bg-white/[0.02] p-3 text-left transition-colors hover:border-white/20"
              >
                <HexAvatar seed={u.handle} size={30} />
                <div className="min-w-0 flex-1">
                  <div className="truncate font-mono text-[13px] font-bold">{u.handle}</div>
                  <div className="text-[11px] text-fg-3">{ROLE_LABEL[u.role]}</div>
                </div>
                <div className="shrink-0 text-right">
                  <div className="font-mono text-[15px] font-bold tabular-nums text-accent">{u.accepted}</div>
                  <div className="font-mono text-[10.5px] text-fg-3">{u.answers} 答中採納</div>
                </div>
              </button>
            ))}
          </div>
        </div>
      ) : null}

      <div className="mb-4 flex h-10 items-center gap-2 rounded-lg border border-white/[0.08] bg-bg-0 px-3">
        <Search size={14} className="text-fg-3" />
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="搜尋帳號或學校" className="w-full bg-transparent text-[13.5px] outline-none placeholder:text-fg-3" />
      </div>

      <Table>
        <thead>
          <tr>
            <Th>學員</Th>
            <Th>學校</Th>
            <Th>階級</Th>
            <Th>XP</Th>
            <Th>解題</Th>
            <Th>助教貢獻</Th>
            <Th>最後上線</Th>
            <Th>角色</Th>
            <Th className="text-right">操作</Th>
          </tr>
        </thead>
        <tbody>
          {visible.map((u) => {
            const rank = rankFor(u.xp, ranks);
            return (
              <Tr key={u.id} className={u.bannedAt ? "opacity-50" : ""}>
                <Td>
                  <button type="button" onClick={() => setSelected(u.id)} className="group flex items-center gap-2.5 text-left">
                    <HexAvatar seed={u.handle} size={30} />
                    <div>
                      <div className="flex items-center gap-1.5 font-mono text-[13.5px] font-bold group-hover:text-accent">
                        {u.handle}
                        {u.role === "ta" ? <ShieldCheck size={12} className="text-blue" /> : null}
                      </div>
                      <div className="text-[11px] text-fg-3">{u.displayName}</div>
                    </div>
                  </button>
                </Td>
                <Td className="text-[13px] text-fg-2">{schoolById(u.schoolId ?? "")?.short ?? "—"}</Td>
                <Td>
                  <span className="text-[12.5px] font-bold" style={{ color: rank.color }}>
                    {rank.name}
                  </span>
                </Td>
                <Td className="font-mono text-[13px] tabular-nums text-accent">{formatNumber(u.xp)}</Td>
                <Td className="font-mono text-[12.5px]">{u.solves}</Td>
                <Td className="font-mono text-[12.5px] tabular-nums">
                  {u.answers ? (
                    <span title="回答數 · 被採納數">
                      {u.answers} 答
                      {u.accepted ? <span className="text-accent"> · {u.accepted} 採納</span> : null}
                    </span>
                  ) : (
                    <span className="text-fg-3">—</span>
                  )}
                </Td>
                <Td className="font-mono text-[11.5px] text-fg-3">{u.lastSeenAt ? relativeTime(u.lastSeenAt, now) : "—"}</Td>
                <Td>
                  {manage ? (
                    <select
                      value={u.role}
                      onChange={async (e) => {
                        const next = e.target.value as Role;
                        await api.users.setRole(u.id, next);
                        await users.reload();
                        toast(u.handle + " 已改為" + ROLE_LABEL[next]);
                      }}
                      className="h-8 rounded-md border border-white/[0.08] bg-bg-0 px-2 text-[12.5px] font-bold outline-none"
                      style={{ color: ROLE_COLOR[u.role] }}
                    >
                      {ROLES.map((r) => (
                        <option key={r} value={r}>
                          {ROLE_LABEL[r]}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <span className="text-[12.5px] font-bold" style={{ color: ROLE_COLOR[u.role] }}>
                      {ROLE_LABEL[u.role]}
                    </span>
                  )}
                </Td>
                <Td>
                  <div className="flex justify-end gap-1">
                    <button
                      onClick={() => setSelected(u.id)}
                      className="flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-[12px] font-bold text-fg-2 hover:bg-white/[0.06] hover:text-fg"
                    >
                      <Eye size={13} />
                      詳情
                    </button>
                    {manage ? (
                      <button
                        onClick={async () => {
                          await api.users.setBanned(u.id, !u.bannedAt);
                          await users.reload();
                          toast(u.bannedAt ? "已解除停權" : "已停權", u.bannedAt ? "ok" : "info");
                        }}
                        className={cn("flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-[12px] font-bold", u.bannedAt ? "text-accent hover:bg-accent/10" : "text-fg-3 hover:bg-red/10 hover:text-red")}
                      >
                        {u.bannedAt ? <Undo2 size={13} /> : <Ban size={13} />}
                        {u.bannedAt ? "解除停權" : "停權"}
                      </button>
                    ) : null}
                  </div>
                </Td>
              </Tr>
            );
          })}
        </tbody>
      </Table>
      <p className="mt-4 font-mono text-[11.5px] text-fg-3">
        {api.mode === "local"
          ? "本機模式顯示的是示範名單。接上 API 後這裡是真實帳號。"
          : manage
            ? "角色變更後，對方下次載入頁面（或重新登入）就會套用；進後台前請先重新整理一次。"
            : "唯讀檢視。要調角色或停權請找管理員。"}
      </p>

      <UserDetailDrawer userId={selected} onClose={() => setSelected(null)} onChanged={() => users.reload()} />
      <ToastHost />
    </div>
  );
}
