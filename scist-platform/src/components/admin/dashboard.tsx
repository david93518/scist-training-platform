"use client";

import Link from "next/link";
import { Users, Activity, GraduationCap, Flag, FileWarning, Plus, Upload, ArrowRight, Database, Wifi, WifiOff } from "lucide-react";
import { getAdminApi } from "@/admin/api";
import { PageTitle, SectionCard, StatusBadge, Table, Td, Th, Tr, ToastHost, useAsync } from "@/components/admin/ui";
import { ProgressBar, buttonClass } from "@/components/ui/primitives";
import { formatNumber, relativeTime } from "@/lib/utils";
import { useNow } from "@/lib/use-now";

export function AdminDashboard() {
  const api = getAdminApi();
  const stats = useAsync(() => api.stats());
  const status = useAsync(() => api.status());
  const now = useNow(60_000);

  const s = stats.data;
  const st = status.data;

  const tiles = [
    { Icon: Users, label: "註冊學員", value: s ? formatNumber(s.users) : "—", color: "#4da3ff" },
    { Icon: Activity, label: "本週活躍", value: s ? formatNumber(s.activeWeek) : "—", color: "#3ee8d5" },
    { Icon: GraduationCap, label: "完成課程數", value: s ? formatNumber(s.lessonsCompleted) : "—", color: "#a4f13b" },
    { Icon: Flag, label: "累積解題", value: s ? formatNumber(s.solves) : "—", color: "#ffb84d" },
  ];

  const integrations = st
    ? [
        { label: "資料庫", ok: st.database !== "local-storage", detail: st.database },
        { label: "Discord 登入", ok: st.discordLogin, detail: "DISCORD_CLIENT_ID" },
        { label: "Cloudflare Stream", ok: st.stream, detail: "CF_STREAM_API_TOKEN" },
        { label: "R2 附件", ok: st.r2, detail: "R2_BUCKET" },
        { label: "靶機 Instancer", ok: st.instancer, detail: "INSTANCER_URL" },
        { label: "Discord Webhook", ok: st.webhook, detail: "DISCORD_WEBHOOK_URL" },
      ]
    : [];

  return (
    <div>
      <PageTitle
        kicker="OVERVIEW"
        title="後台總覽"
        desc="這裡看平台整體狀況：學員、完成率、卡關點，以及外部服務有沒有接上。"
        actions={
          <>
            <Link href="/admin/lessons/new" className={buttonClass("primary", "sm")}>
              <Plus size={14} />
              上架課程
            </Link>
            <Link href="/admin/challenges/new" className={buttonClass("outline", "sm")}>
              <Plus size={14} />
              新增題目
            </Link>
            <Link href="/admin/settings#import" className={buttonClass("outline", "sm")}>
              <Upload size={14} />
              匯入 CTFd
            </Link>
          </>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {tiles.map((t) => (
          <div key={t.label} className="card flex items-center gap-4 p-5">
            <span className="clip-hex grid h-12 w-12 shrink-0 place-items-center" style={{ background: t.color + "22" }}>
              <t.Icon size={19} style={{ color: t.color }} />
            </span>
            <div>
              <div className="font-mono text-[26px] font-bold leading-none tabular-nums">{t.value}</div>
              <div className="mt-1.5 text-[12px] text-fg-3">{t.label}</div>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-[1.3fr_1fr]">
        <SectionCard
          title="卡關點"
          desc="解題率最低的題目。企劃書要求追蹤這個，來決定下一場 Bug 診療室要講什麼。"
          right={
            <Link href="/admin/challenges" className="text-[12.5px] text-accent hover:underline">
              全部題目 →
            </Link>
          }
        >
          {s ? (
            <div className="flex flex-col gap-3">
              {s.stuck.map((c) => (
                <Link key={c.slug} href={"/admin/challenges/" + c.slug} className="group">
                  <div className="mb-1.5 flex items-center justify-between text-[13.5px]">
                    <span className="font-bold group-hover:text-accent">{c.name}</span>
                    <span className="font-mono text-[12px] text-fg-3">
                      {c.solves} 解 / {formatNumber(c.attempts)} 次嘗試 ·{" "}
                      <span className={c.rate < 0.25 ? "text-red" : c.rate < 0.5 ? "text-amber" : "text-accent"}>
                        {Math.round(c.rate * 100)}%
                      </span>
                    </span>
                  </div>
                  <ProgressBar value={c.rate} height={5} color={c.rate < 0.25 ? "#ff5e5e" : c.rate < 0.5 ? "#ffb84d" : "#a4f13b"} />
                </Link>
              ))}
            </div>
          ) : (
            <p className="text-[13px] text-fg-3">載入中</p>
          )}
        </SectionCard>

        <div className="flex flex-col gap-6">
          <SectionCard
            title="整合狀態"
            desc="每一項對應一組環境變數，設定方式在 docs/INTEGRATIONS.md。"
          >
            <div className="flex flex-col gap-2">
              {integrations.map((i) => (
                <div key={i.label} className="flex items-center gap-3 rounded-lg border border-white/[0.06] bg-white/[0.02] px-3 py-2.5">
                  {i.ok ? <Wifi size={14} className="text-accent" /> : <WifiOff size={14} className="text-fg-3" />}
                  <span className="flex-1 text-[13px] font-semibold">{i.label}</span>
                  <span className={"font-mono text-[11px] " + (i.ok ? "text-accent" : "text-fg-3")}>{i.ok ? "已設定" : i.detail}</span>
                </div>
              ))}
              {st ? (
                <div className="mt-1 flex items-center gap-2 rounded-lg border border-amber/30 bg-amber/[0.06] px-3 py-2.5 text-[12px] text-fg-2">
                  <Database size={13} className="text-amber" />
                  {st.mode === "local"
                    ? "後台目前是本機模式：資料存在這台瀏覽器，前台不會變。設定 NEXT_PUBLIC_ADMIN_API=http 切到真正的 API。"
                    : "後台已接上 API，變更會直接寫入資料庫。"}
                </div>
              ) : null}
            </div>
          </SectionCard>

          <SectionCard title="待處理" desc="草稿與尚未回覆的問題。">
            <div className="flex flex-col gap-2">
              <Link href="/admin/lessons" className="flex items-center gap-3 rounded-lg border border-white/[0.06] bg-white/[0.02] px-3 py-2.5 hover:border-white/20">
                <FileWarning size={14} className="text-amber" />
                <span className="flex-1 text-[13px]">草稿中的內容</span>
                <span className="font-mono text-[13px] font-bold">{s?.drafts ?? "—"}</span>
              </Link>
              <Link href="/admin/questions" className="flex items-center gap-3 rounded-lg border border-white/[0.06] bg-white/[0.02] px-3 py-2.5 hover:border-white/20">
                <ArrowRight size={14} className="text-blue" />
                <span className="flex-1 text-[13px]">去看問答</span>
              </Link>
            </div>
          </SectionCard>
        </div>
      </div>

      <div className="mt-6">
        <SectionCard title="最近更新" desc="剛編輯過的課程與題目。">
          {s ? (
            <Table>
              <thead>
                <tr>
                  <Th>類型</Th>
                  <Th>標題</Th>
                  <Th>狀態</Th>
                  <Th>更新</Th>
                </tr>
              </thead>
              <tbody>
                {s.recent.map((r, i) => (
                  <Tr key={i}>
                    <Td className="font-mono text-[11.5px] text-fg-3">{r.kind === "lesson" ? "課程" : r.kind === "challenge" ? "題目" : "活動"}</Td>
                    <Td className="font-semibold">{r.title}</Td>
                    <Td>
                      <StatusBadge status={r.status} />
                    </Td>
                    <Td className="font-mono text-[12px] text-fg-3">{relativeTime(r.at, now)}</Td>
                  </Tr>
                ))}
              </tbody>
            </Table>
          ) : null}
        </SectionCard>
      </div>
      <ToastHost />
    </div>
  );
}
