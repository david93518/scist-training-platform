"use client";

import { useState } from "react";
import { Ban, CalendarDays, Clock, KeyRound, Minus, Plus, Undo2, Zap, Check } from "lucide-react";
import { getAdminApi } from "@/admin/api";
import type { Role, XpReason } from "@/admin/types";
import { schoolById } from "@/data/schools";
import { Button, HexAvatar, ProgressBar } from "@/components/ui/primitives";
import { Drawer, Field, Input, Select, useAsync, useToast } from "@/components/admin/ui";
import { ROLE_COLOR, ROLE_LABEL } from "@/components/admin/admin-shell";
import { nextRank, rankFor } from "@/lib/xp";
import { useRanks } from "@/components/settings-provider";
import { cn, formatDate, formatNumber, relativeTime } from "@/lib/utils";
import { useNow } from "@/lib/use-now";

const ROLES: Role[] = ["student", "ta", "instructor", "admin"];
const REASON: Record<XpReason, { label: string; color: string }> = {
  checkpoint: { label: "檢查站", color: "#4da3ff" },
  lesson: { label: "完課", color: "#3ee8d5" },
  solve: { label: "解題", color: "#a4f13b" },
  hint: { label: "提示", color: "#ffb84d" },
  event: { label: "活動", color: "#b983ff" },
  admin: { label: "管理員", color: "#ff6fb5" },
};

function Stat({ label, value, sub, color }: { label: string; value: string; sub?: string; color?: string }) {
  return (
    <div className="rounded-xl border border-white/[0.08] bg-white/[0.02] px-4 py-3">
      <div className="mono-label">{label}</div>
      <div className="mt-1 font-mono text-[22px] font-bold leading-none" style={color ? { color } : undefined}>
        {value}
      </div>
      {sub ? <div className="mt-1.5 truncate text-[11.5px] text-fg-3">{sub}</div> : null}
    </div>
  );
}

export function UserDetailDrawer({ userId, onClose, onChanged }: { userId: string | null; onClose: () => void; onChanged: () => void }) {
  const api = getAdminApi();
  const toast = useToast((s) => s.push);
  const now = useNow(60_000);
  const detail = useAsync(() => (userId ? api.users.detail(userId) : Promise.resolve(null)), [userId]);
  const [delta, setDelta] = useState("");
  const [reason, setReason] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [tab, setTab] = useState<"ledger" | "solves" | "lessons">("ledger");

  const ranks = useRanks();
  const d = detail.data;
  const u = d?.user;
  const rank = u ? rankFor(u.xp, ranks) : null;
  const next = u ? nextRank(u.xp, ranks) : null;

  const refresh = async () => {
    await detail.reload();
    onChanged();
  };

  const adjust = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userId) return;
    const n = Number(delta);
    if (!Number.isInteger(n) || n === 0) return toast("請輸入不為 0 的整數", "err");
    if (!reason.trim()) return toast("要寫原因，會留在操作紀錄裡", "err");
    setBusy(true);
    try {
      const xp = await api.users.adjustXp(userId, n, reason.trim());
      toast("已調整，現在 " + formatNumber(xp) + " XP");
      setDelta("");
      setReason("");
      await refresh();
    } catch (err) {
      toast(err instanceof Error ? err.message : "調整失敗", "err");
    } finally {
      setBusy(false);
    }
  };

  const bump = (by: number) => setDelta(String((Number(delta) || 0) + by));

  return (
    <Drawer open={Boolean(userId)} onClose={onClose} title={u ? <span className="font-mono">@{u.handle}</span> : "學員"} width={580}>
      {!d || !u || !rank ? (
        <p className="text-[13px] text-fg-3">{detail.error ?? "載入中"}</p>
      ) : (
        <div className="flex flex-col gap-6">
          <div className="flex items-start gap-4">
            <HexAvatar seed={u.handle} size={64} />
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-mono text-[20px] font-extrabold">{u.handle}</span>
                <span
                  className="rounded-md border px-2 py-0.5 font-mono text-[10.5px] tracking-wider"
                  style={{ color: ROLE_COLOR[u.role], borderColor: ROLE_COLOR[u.role] + "55", background: ROLE_COLOR[u.role] + "14" }}
                >
                  {ROLE_LABEL[u.role].toUpperCase()}
                </span>
                {u.bannedAt ? <span className="rounded-md border border-red/40 bg-red/10 px-2 py-0.5 font-mono text-[10.5px] text-red">已停權</span> : null}
                {u.hasPassword ? null : <span className="rounded-md border border-white/15 px-2 py-0.5 font-mono text-[10.5px] text-fg-3">尚未設密碼</span>}
              </div>
              <div className="mt-1 text-[13px] text-fg-2">
                {u.displayName} · {schoolById(u.schoolId ?? "")?.name ?? "未填學校"}
              </div>
              <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 font-mono text-[11.5px] text-fg-3">
                <span className="flex items-center gap-1">
                  <CalendarDays size={11} />
                  加入 {d.joinedAt ? formatDate(d.joinedAt) : "—"}
                </span>
                <span className="flex items-center gap-1">
                  <Clock size={11} />
                  上線 {u.lastSeenAt ? relativeTime(u.lastSeenAt, now) : "—"}
                </span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Stat label="XP" value={formatNumber(u.xp)} color={rank.color} sub={rank.name + (next ? " · 距 " + next.name + " 還差 " + formatNumber(next.minXp - u.xp) : " · 最高階")} />
            <Stat label="解題" value={String(u.solves)} sub="累積 flag 數" />
            <Stat label="發問" value={String(d.questions)} sub="則問題" />
            <Stat label="助教貢獻" value={String(u.answers)} sub={u.answers ? "則回答 · " + u.accepted + " 則被採納" : "還沒回答過"} />
          </div>

          <div className="grid gap-3 sm:grid-cols-[1fr_auto] sm:items-end">
            <Field label="角色" hint="助教能回答與採納；講師能上架；管理員能改設定與角色">
              <Select
                value={u.role}
                onChange={async (e) => {
                  const role = e.target.value as Role;
                  try {
                    await api.users.setRole(u.id, role);
                    toast(u.handle + " 已改為" + ROLE_LABEL[role]);
                    await refresh();
                  } catch (err) {
                    toast(err instanceof Error ? err.message : "變更失敗", "err");
                  }
                }}
                style={{ color: ROLE_COLOR[u.role] }}
                className="font-bold"
              >
                {ROLES.map((r) => (
                  <option key={r} value={r}>
                    {ROLE_LABEL[r]}
                  </option>
                ))}
              </Select>
            </Field>
            <Button
              variant={u.bannedAt ? "outline" : "ghost"}
              size="md"
              className={cn("mb-[22px]", !u.bannedAt && "text-fg-3 hover:text-red")}
              onClick={async () => {
                try {
                  await api.users.setBanned(u.id, !u.bannedAt);
                  toast(u.bannedAt ? "已解除停權" : "已停權", u.bannedAt ? "ok" : "info");
                  await refresh();
                } catch (err) {
                  toast(err instanceof Error ? err.message : "變更失敗", "err");
                }
              }}
            >
              {u.bannedAt ? <Undo2 size={14} /> : <Ban size={14} />}
              {u.bannedAt ? "解除停權" : "停權"}
            </Button>
          </div>

          <form onSubmit={adjust} className="rounded-xl border border-white/[0.08] bg-white/[0.02] p-4">
            <div className="mb-3 flex items-center gap-2 text-[13.5px] font-bold">
              <Zap size={14} className="text-accent" />
              調整 XP
            </div>
            <div className="grid gap-3 sm:grid-cols-[150px_1fr_auto]">
              <div className="flex items-center gap-1">
                <button type="button" onClick={() => bump(-50)} className="grid h-10 w-9 shrink-0 place-items-center rounded-lg border border-white/[0.08] text-fg-3 hover:text-fg" aria-label="減 50">
                  <Minus size={13} />
                </button>
                <Input value={delta} onChange={(e) => setDelta(e.target.value)} placeholder="±XP" className="text-center font-mono" inputMode="numeric" />
                <button type="button" onClick={() => bump(50)} className="grid h-10 w-9 shrink-0 place-items-center rounded-lg border border-white/[0.08] text-fg-3 hover:text-fg" aria-label="加 50">
                  <Plus size={13} />
                </button>
              </div>
              <Input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="原因，例如：活動加分、誤判補回" />
              <Button type="submit" size="md" disabled={busy}>
                <Check size={14} strokeWidth={3} />
                送出
              </Button>
            </div>
            <p className="mt-2 text-[11.5px] text-fg-3">走 XP 流水帳，排行榜會一起變；這個操作會留在操作紀錄裡。</p>
          </form>

          <form
            onSubmit={async (e) => {
              e.preventDefault();
              if (newPassword.length < 8) return toast("密碼至少 8 個字", "err");
              setBusy(true);
              try {
                await api.users.setPassword(u.id, newPassword);
                toast("已重設 " + u.handle + " 的密碼");
                setNewPassword("");
                await refresh();
              } catch (err) {
                toast(err instanceof Error ? err.message : "重設失敗", "err");
              } finally {
                setBusy(false);
              }
            }}
            className="rounded-xl border border-white/[0.08] bg-white/[0.02] p-4"
          >
            <div className="mb-3 flex items-center gap-2 text-[13.5px] font-bold">
              <KeyRound size={14} className="text-accent" />
              重設密碼
            </div>
            <div className="flex flex-wrap items-end gap-3">
              <Field label="新密碼" className="min-w-[220px] flex-1">
                <Input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="至少 8 個字" autoComplete="new-password" />
              </Field>
              <Button type="submit" size="md" disabled={busy || newPassword.length < 8}>
                重設
              </Button>
            </div>
            <p className="mt-2 text-[11.5px] text-fg-3">對方下次請用這組新密碼登入。這個操作會留在操作紀錄裡。</p>
          </form>

          <div>
            <div className="mb-3 flex w-fit rounded-lg border border-white/[0.08] bg-bg-0 p-0.5">
              {(
                [
                  ["ledger", "XP 紀錄", d.ledger.length],
                  ["solves", "解題", d.solves.length],
                  ["lessons", "課程進度", d.lessons.length],
                ] as const
              ).map(([id, label, n]) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => setTab(id)}
                  className={cn("flex items-center gap-1.5 rounded-md px-3 py-1.5 text-[12.5px] font-bold", tab === id ? "bg-white/[0.1] text-fg" : "text-fg-3")}
                >
                  {label}
                  <span className="font-mono text-[10.5px] text-fg-3">{n}</span>
                </button>
              ))}
            </div>

            {tab === "ledger" ? (
              d.ledger.length === 0 ? (
                <p className="py-6 text-center text-[13px] text-fg-3">還沒有 XP 紀錄。</p>
              ) : (
                <div className="divide-y divide-white/[0.06]">
                  {d.ledger.map((l) => {
                    const meta = REASON[l.reason] ?? REASON.admin;
                    return (
                      <div key={l.id} className="flex items-center gap-3 py-2.5">
                        <span className={cn("w-16 shrink-0 font-mono text-[13px] font-bold tabular-nums", l.delta >= 0 ? "text-accent" : "text-red")}>
                          {l.delta > 0 ? "+" : ""}
                          {l.delta}
                        </span>
                        <span className="shrink-0 rounded border px-1.5 py-px font-mono text-[10px]" style={{ color: meta.color, borderColor: meta.color + "55" }}>
                          {meta.label}
                        </span>
                        <span className="min-w-0 flex-1 truncate text-[12.5px] text-fg-2">{l.label}</span>
                        <span className="shrink-0 font-mono text-[11px] text-fg-3">{relativeTime(l.at, now)}</span>
                      </div>
                    );
                  })}
                </div>
              )
            ) : null}

            {tab === "solves" ? (
              d.solves.length === 0 ? (
                <p className="py-6 text-center text-[13px] text-fg-3">還沒解過題。</p>
              ) : (
                <div className="divide-y divide-white/[0.06]">
                  {d.solves.map((s, i) => (
                    <div key={s.slug + i} className="flex items-center gap-3 py-2.5">
                      <span className="min-w-0 flex-1 truncate text-[13px] font-semibold">{s.name}</span>
                      <span className="font-mono text-[12px] text-accent">+{s.points}</span>
                      <span className="shrink-0 font-mono text-[11px] text-fg-3">{relativeTime(s.at, now)}</span>
                    </div>
                  ))}
                </div>
              )
            ) : null}

            {tab === "lessons" ? (
              d.lessons.length === 0 ? (
                <p className="py-6 text-center text-[13px] text-fg-3">還沒開始任何課程。</p>
              ) : (
                <div className="divide-y divide-white/[0.06]">
                  {d.lessons.map((l, i) => (
                    <div key={l.title + i} className="py-2.5">
                      <div className="flex items-center gap-3">
                        <span className="min-w-0 flex-1 truncate text-[13px] font-semibold">{l.title}</span>
                        <span className="shrink-0 font-mono text-[11px] text-fg-3">{l.track}</span>
                        {l.completed ? <Check size={13} className="shrink-0 text-accent" strokeWidth={3} /> : <span className="shrink-0 font-mono text-[11px] text-fg-3">{Math.round(l.watched * 100)}%</span>}
                      </div>
                      <ProgressBar value={l.watched} height={3} color={l.completed ? "#a4f13b" : "#4da3ff"} className="mt-2" />
                    </div>
                  ))}
                </div>
              )
            ) : null}
          </div>

          {api.mode === "local" ? <p className="font-mono text-[11px] text-fg-3">本機模式：紀錄是示範資料，只有你在這裡做的 XP 調整是真的。</p> : null}
        </div>
      )}
    </Drawer>
  );
}
