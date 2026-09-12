"use client";

import Link from "next/link";
import { useState } from "react";
import { Power, RefreshCw, Server, Timer, Wifi, WifiOff } from "lucide-react";
import { getAdminApi } from "@/admin/api";
import type { InstanceStatus } from "@/admin/types";
import { Button, HexAvatar } from "@/components/ui/primitives";
import { ConfirmDelete, EmptyState, PageTitle, Table, Td, Th, Tr, ToastHost, useAsync, useToast } from "@/components/admin/ui";
import { can } from "@/lib/permissions";
import { useProgress } from "@/store/progress";
import { cn, relativeTime } from "@/lib/utils";
import { useNow } from "@/lib/use-now";

const STATUS: Record<InstanceStatus, { label: string; color: string }> = {
  starting: { label: "啟動中", color: "#4da3ff" },
  running: { label: "運行中", color: "#a4f13b" },
  stopped: { label: "已關閉", color: "#6b7a8e" },
  error: { label: "錯誤", color: "#ff5e5e" },
};

function MaybeLink({ href, className, children }: { href: string | null; className?: string; children: React.ReactNode }) {
  if (!href) return <span className={className}>{children}</span>;
  return (
    <Link href={href} className={cn(className, "hover:text-accent")}>
      {children}
    </Link>
  );
}

function countdown(iso: string, now: number) {
  const ms = new Date(iso).getTime() - now;
  if (ms <= 0) return "已到期";
  const m = Math.floor(ms / 60_000);
  const s = Math.floor((ms % 60_000) / 1000);
  return m + ":" + String(s).padStart(2, "0");
}

export function InstancesAdmin() {
  const api = getAdminApi();
  const toast = useToast((s) => s.push);
  const list = useAsync(() => api.instances.list());
  const status = useAsync(() => api.status());
  const now = useNow(1000);
  const role = useProgress((s) => s.role);
  const mayKillAll = can(role, "instances.killAll");
  const mayOpenUser = can(role, "users.read");
  const mayOpenChallenge = can(role, "content.read");
  const [busy, setBusy] = useState<string | null>(null);

  const items = list.data ?? [];
  const soon = items.filter((i) => new Date(i.expiresAt).getTime() - now < 10 * 60_000);
  const online = status.data?.instancer ?? false;

  const kill = async (id: string) => {
    setBusy(id);
    try {
      await api.instances.kill(id);
      await list.reload();
      toast("已關閉環境");
    } catch (err) {
      toast(err instanceof Error ? err.message : "關閉失敗", "err");
    } finally {
      setBusy(null);
    }
  };

  const tiles = [
    { Icon: Server, label: "運行中的環境", value: items.length, color: "#a4f13b" },
    { Icon: Timer, label: "十分鐘內到期", value: soon.length, color: "#ffb84d" },
    { Icon: online ? Wifi : WifiOff, label: "Instancer", value: online ? "已連線" : "模擬模式", color: online ? "#a4f13b" : "#6b7a8e" },
  ];

  return (
    <div>
      <PageTitle
        kicker="INSTANCES"
        title="靶機環境"
        desc="每個學員啟動的 Docker 環境都在這裡。到期會自動回收；卡住或被玩壞的可以手動關閉，學員重新啟動就會拿到乾淨的一份。"
        actions={
          <>
            <Button variant="outline" size="sm" onClick={() => list.reload()}>
              <RefreshCw size={13} className={list.loading ? "animate-spin" : ""} />
              重新整理
            </Button>
            {items.length && mayKillAll ? (
              <ConfirmDelete
                label="全部關閉"
                onConfirm={async () => {
                  const n = await api.instances.killAll();
                  await list.reload();
                  toast("已關閉 " + n + " 個環境", "info");
                }}
              />
            ) : null}
          </>
        }
      />

      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        {tiles.map((t) => (
          <div key={t.label} className="card flex items-center gap-4 p-5">
            <span className="clip-hex grid h-12 w-12 shrink-0 place-items-center" style={{ background: t.color + "22" }}>
              <t.Icon size={19} style={{ color: t.color }} />
            </span>
            <div>
              <div className={cn("font-bold leading-none", typeof t.value === "number" ? "font-mono text-[26px]" : "text-[18px]")}>{t.value}</div>
              <div className="mt-1.5 text-[12px] text-fg-3">{t.label}</div>
            </div>
          </div>
        ))}
      </div>

      {items.length === 0 && !list.loading ? (
        <EmptyState title="目前沒有運行中的環境" desc="學員在題目頁按「啟動環境」後會出現在這裡。" />
      ) : (
        <Table>
          <thead>
            <tr>
              <Th>學員</Th>
              <Th>題目</Th>
              <Th>連線資訊</Th>
              <Th>啟動</Th>
              <Th>剩餘</Th>
              <Th>狀態</Th>
              <Th className="text-right">操作</Th>
            </tr>
          </thead>
          <tbody>
            {items.map((i) => {
              const st = STATUS[i.status];
              const expiring = new Date(i.expiresAt).getTime() - now < 10 * 60_000;
              return (
                <Tr key={i.id}>
                  <Td>
                    {/* 助教看得到靶機，但沒有學員與題庫頁，連過去只會被擋回來 */}
                    <MaybeLink href={mayOpenUser ? "/admin/users?u=" + i.userId : null} className="flex items-center gap-2.5 font-mono text-[13px] font-bold">
                      <HexAvatar seed={i.userHandle} size={28} />
                      {i.userHandle}
                    </MaybeLink>
                  </Td>
                  <Td>
                    <MaybeLink href={mayOpenChallenge ? "/admin/challenges/" + i.challengeId : null} className="font-semibold">
                      {i.challengeName}
                    </MaybeLink>
                    <div className="font-mono text-[11px] text-fg-3">/{i.challengeSlug}</div>
                  </Td>
                  <Td className="font-mono text-[12.5px] text-fg-2">{i.host ? i.host + (i.port ? ":" + i.port : "") : "—"}</Td>
                  <Td className="font-mono text-[11.5px] text-fg-3">{relativeTime(i.createdAt, now)}</Td>
                  <Td className={cn("font-mono text-[12.5px] tabular-nums", expiring ? "text-amber" : "text-fg-2")}>{countdown(i.expiresAt, now)}</Td>
                  <Td>
                    <span className="inline-flex items-center gap-1.5 rounded-md border px-2 py-0.5 font-mono text-[10.5px] tracking-wider" style={{ color: st.color, borderColor: st.color + "55", background: st.color + "14" }}>
                      <span className={cn("h-1.5 w-1.5 rounded-full", i.status === "running" && "animate-pulse")} style={{ background: st.color }} />
                      {st.label}
                    </span>
                  </Td>
                  <Td>
                    <div className="flex justify-end">
                      <button
                        onClick={() => kill(i.id)}
                        disabled={busy === i.id}
                        className="flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-[12px] font-bold text-fg-3 hover:bg-red/10 hover:text-red disabled:opacity-50"
                      >
                        <Power size={13} />
                        關閉
                      </button>
                    </div>
                  </Td>
                </Tr>
              );
            })}
          </tbody>
        </Table>
      )}

      <p className="mt-4 font-mono text-[11.5px] text-fg-3">
        {api.mode === "local"
          ? "本機模式：這幾個是示範環境，關閉只影響這台瀏覽器。接上 instancer 後這裡是 VPS 上真正的容器。"
          : online
            ? "關閉會通知 instancer 刪除容器，並把資料庫的狀態標成已關閉。"
            : "instancer 未設定：環境是模擬的，關閉只更新資料庫。設定方式見 docs/INTEGRATIONS.md 第 6 節。"}
      </p>
      <ToastHost />
    </div>
  );
}
