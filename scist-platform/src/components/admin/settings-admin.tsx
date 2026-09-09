"use client";

import { useEffect, useRef, useState } from "react";
import { Download, RotateCcw, Upload, Wifi, WifiOff, BookOpen } from "lucide-react";
import { getAdminApi } from "@/admin/api";
import { useAdminStore } from "@/admin/store";
import type { AdminSettings } from "@/admin/types";
import { Button, buttonClass } from "@/components/ui/primitives";
import { Field, Input, PageTitle, SaveButton, SectionCard, Select, Toggle, ToastHost, useAsync, useToast } from "@/components/admin/ui";
import type { IntegrationStatus } from "@/admin/types";
import { formatNumber } from "@/lib/utils";

const INTEGRATIONS: { key: keyof Omit<IntegrationStatus, "mode" | "database">; label: string; env: string; doc: string }[] = [
  { key: "discordLogin", label: "Discord 登入", env: "DISCORD_CLIENT_ID / DISCORD_CLIENT_SECRET", doc: "OAuth 流程與 redirect URI" },
  { key: "stream", label: "Cloudflare Stream", env: "CF_ACCOUNT_ID / CF_STREAM_API_TOKEN / CF_STREAM_CUSTOMER_CODE", doc: "影片直傳與播放" },
  { key: "r2", label: "Cloudflare R2", env: "R2_ACCOUNT_ID / R2_ACCESS_KEY_ID / R2_SECRET_ACCESS_KEY / R2_BUCKET", doc: "附件預簽名上傳" },
  { key: "instancer", label: "靶機 Instancer", env: "INSTANCER_URL / INSTANCER_SECRET", doc: "每人一份 Docker 環境" },
  { key: "webhook", label: "Discord Webhook", env: "DISCORD_WEBHOOK_URL", doc: "新問題、First Blood 通知" },
];
export function SettingsAdmin() {
  const api = getAdminApi();
  const toast = useToast((s) => s.push);
  const status = useAsync(() => api.status());
  const [draft, setDraft] = useState<AdminSettings | null>(null);
  const [saving, setSaving] = useState(false);
  const [importPreview, setImportPreview] = useState<{ name: string; count: number; payload: unknown } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const resetLocal = useAdminStore((s) => s.reset);

  useEffect(() => {
    api.settings.get().then(setDraft);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!draft) return <p className="text-fg-3">載入中</p>;

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.settings.save({ ...draft, ranks: [...draft.ranks].sort((a, b) => a.minXp - b.minXp) });
      toast("設定已儲存");
    } finally {
      setSaving(false);
    }
  };

  const pickFile = async (f: File) => {
    try {
      const payload = JSON.parse(await f.text());
      const count = Array.isArray(payload?.challenges) ? payload.challenges.length : 0;
      if (!count) return toast("這不是 CTFd 匯出檔（找不到 challenges 陣列）", "err");
      setImportPreview({ name: f.name, count, payload });
    } catch {
      toast("JSON 解析失敗", "err");
    }
  };

  const doExport = async () => {
    const data = await api.exportAll();
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "scist-gate-export.json";
    a.click();
    URL.revokeObjectURL(url);
    toast("已匯出");
  };

  const st = status.data;

  return (
    <form onSubmit={save}>
      <PageTitle kicker="SETTINGS" title="設定與整合" desc="站點文案、階級門檻、XP 規則、外部服務狀態、匯入匯出。" actions={<SaveButton saving={saving} />} />

      <div className="grid gap-6 xl:grid-cols-2">
        <SectionCard title="站點">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="名稱">
              <Input value={draft.site.name} onChange={(e) => setDraft({ ...draft, site: { ...draft.site, name: e.target.value } })} />
            </Field>
            <Field label="標語">
              <Input value={draft.site.tagline} onChange={(e) => setDraft({ ...draft, site: { ...draft.site, tagline: e.target.value } })} />
            </Field>
            <Field label="Discord 邀請連結">
              <Input value={draft.site.discordInvite} onChange={(e) => setDraft({ ...draft, site: { ...draft.site, discordInvite: e.target.value } })} className="font-mono" />
            </Field>
            <Field label="正式開放" hint="顯示在首頁的徽章">
              <Input value={draft.site.launch} onChange={(e) => setDraft({ ...draft, site: { ...draft.site, launch: e.target.value } })} />
            </Field>
          </div>
        </SectionCard>

        <SectionCard title="XP 規則與排行榜">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="檢查站預設 XP">
              <Input type="number" min={0} value={draft.xp.checkpointDefault} onChange={(e) => setDraft({ ...draft, xp: { ...draft.xp, checkpointDefault: Number(e.target.value) } })} />
            </Field>
            <Field label="完成課程預設 XP">
              <Input type="number" min={0} value={draft.xp.lessonDefault} onChange={(e) => setDraft({ ...draft, xp: { ...draft.xp, lessonDefault: Number(e.target.value) } })} />
            </Field>
            <Field label="週榜起算日">
              <Select value={draft.leaderboard.weekStartsOn} onChange={(e) => setDraft({ ...draft, leaderboard: { weekStartsOn: Number(e.target.value) } })}>
                <option value={0}>週日</option>
                <option value={1}>週一</option>
              </Select>
            </Field>
            <div className="sm:col-span-2 flex flex-col gap-2">
              <Toggle checked={draft.xp.hintRefundOnSolve} onChange={(v) => setDraft({ ...draft, xp: { ...draft.xp, hintRefundOnSolve: v } })} label="解出後退還提示扣的 XP" hint="鼓勵用提示；預設關閉，讓學員先自己想" />
              <Toggle checked={draft.features.guestProgress} onChange={(v) => setDraft({ ...draft, features: { ...draft.features, guestProgress: v } })} label="允許未登入者累積進度" hint="存在瀏覽器，登入後可合併" />
              <Toggle checked={draft.features.instances} onChange={(v) => setDraft({ ...draft, features: { ...draft.features, instances: v } })} label="開放啟動靶機環境" hint="關閉時題目頁只顯示固定連線資訊" />
              <Toggle checked={draft.features.questions} onChange={(v) => setDraft({ ...draft, features: { ...draft.features, questions: v } })} label="開放發問" />
            </div>
          </div>
        </SectionCard>

        <SectionCard title="階級門檻" desc="XP 達到門檻就晉升。名稱與顏色會出現在排行榜與個人頁。">
          <div className="flex flex-col gap-2">
            {draft.ranks.map((r, i) => (
              <div key={r.id} className="grid grid-cols-[28px_1fr_1fr_110px_90px] items-center gap-2">
                <span className="clip-hex h-6 w-6" style={{ background: r.color }} />
                <Input value={r.name} onChange={(e) => setDraft({ ...draft, ranks: draft.ranks.map((x, k) => (k === i ? { ...x, name: e.target.value } : x)) })} />
                <Input value={r.en} onChange={(e) => setDraft({ ...draft, ranks: draft.ranks.map((x, k) => (k === i ? { ...x, en: e.target.value } : x)) })} className="font-mono" />
                <Input type="number" min={0} value={r.minXp} onChange={(e) => setDraft({ ...draft, ranks: draft.ranks.map((x, k) => (k === i ? { ...x, minXp: Number(e.target.value) } : x)) })} className="font-mono" />
                <Input value={r.color} onChange={(e) => setDraft({ ...draft, ranks: draft.ranks.map((x, k) => (k === i ? { ...x, color: e.target.value } : x)) })} className="font-mono" />
              </div>
            ))}
          </div>
        </SectionCard>

        <SectionCard title="整合狀態" desc="每一項都對應環境變數，填在 .env.local，重啟後生效。細節在 docs/INTEGRATIONS.md。">
          <div className="flex flex-col gap-2">
            {INTEGRATIONS.map((i) => {
              const ok = st ? Boolean(st[i.key]) : false;
              return (
                <div key={i.key} className="flex items-start gap-3 rounded-lg border border-white/[0.06] bg-white/[0.02] px-3.5 py-3">
                  {ok ? <Wifi size={15} className="mt-0.5 text-accent" /> : <WifiOff size={15} className="mt-0.5 text-fg-3" />}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-[13.5px] font-bold">{i.label}</span>
                      <span className={"font-mono text-[10.5px] " + (ok ? "text-accent" : "text-amber")}>{ok ? "已設定" : "未設定"}</span>
                    </div>
                    <div className="text-[11.5px] text-fg-3">{i.doc}</div>
                    <div className="mt-1 truncate font-mono text-[10.5px] text-fg-3">{i.env}</div>
                  </div>
                </div>
              );
            })}
            <div className="flex items-center gap-3 rounded-lg border border-white/[0.06] bg-white/[0.02] px-3.5 py-3">
              <BookOpen size={15} className="text-blue" />
              <div className="text-[12.5px] text-fg-2">
                資料庫：<span className="font-mono text-fg">{st?.database ?? "…"}</span> · 後台模式：<span className="font-mono text-fg">{st?.mode ?? "…"}</span>
              </div>
            </div>
          </div>
        </SectionCard>

        <SectionCard title="匯入 CTFd" desc="把現有 CTFd 的題目搬過來。上傳 CTFd 匯出的 JSON，題目會以草稿建立，flag 明文會轉成雜湊。" className="scroll-mt-24">
          <div id="import" />
          <input
            ref={fileRef}
            type="file"
            accept="application/json"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) pickFile(f);
              e.currentTarget.value = "";
            }}
          />
          {importPreview ? (
            <div className="flex flex-col gap-3 rounded-lg border border-accent/30 bg-accent/[0.05] p-4">
              <div className="text-[13.5px]">
                <span className="font-mono">{importPreview.name}</span> 裡有 <span className="font-bold text-accent">{formatNumber(importPreview.count)}</span> 題。
              </div>
              <div className="flex gap-2">
                <Button
                  type="button"
                  size="sm"
                  onClick={async () => {
                    try {
                      const r = await api.importCtfd(importPreview.payload);
                      toast("匯入 " + r.imported + " 題，略過 " + r.skipped + " 題（重複或無效）");
                      setImportPreview(null);
                    } catch (err) {
                      toast(err instanceof Error ? err.message : "匯入失敗", "err");
                    }
                  }}
                >
                  <Upload size={13} />
                  開始匯入
                </Button>
                <Button type="button" size="sm" variant="ghost" onClick={() => setImportPreview(null)}>
                  取消
                </Button>
              </div>
            </div>
          ) : (
            <button type="button" onClick={() => fileRef.current?.click()} className={buttonClass("outline", "md")}>
              <Upload size={14} />
              選擇 CTFd 匯出檔（JSON）
            </button>
          )}
          <p className="mt-3 font-mono text-[11px] leading-relaxed text-fg-3">支援格式：{"{ challenges: [{ name, category, value, description, flags: [{ content }], hints: [{ content, cost }] }] }"}</p>
        </SectionCard>

        <SectionCard title="匯出與重置">
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={doExport} className={buttonClass("outline", "md")}>
              <Download size={14} />
              匯出全部內容（JSON）
            </button>
            {api.mode === "local" ? (
              <button
                type="button"
                onClick={() => {
                  if (confirm("把後台本機資料重置回初始示範內容？")) {
                    resetLocal();
                    toast("已重置為示範資料");
                    api.settings.get().then(setDraft);
                  }
                }}
                className={buttonClass("ghost", "md")}
              >
                <RotateCcw size={14} />
                重置本機資料
              </button>
            ) : null}
          </div>
          <p className="mt-3 text-[12.5px] leading-relaxed text-fg-3">匯出檔可以當備份，也可以在另一台機器的後台匯入（接上 API 後由 POST /api/admin/import 處理）。</p>
        </SectionCard>
      </div>
      <ToastHost />
    </form>
  );
}
