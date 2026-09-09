"use client";

import { useEffect, useRef, useState } from "react";
import { Download, Megaphone, RotateCcw, Upload, Wifi, WifiOff, BookOpen } from "lucide-react";
import { getAdminApi } from "@/admin/api";
import { useAdminStore } from "@/admin/store";
import type { AdminSettings } from "@/admin/types";
import { Button, buttonClass } from "@/components/ui/primitives";
import { Field, Input, PageTitle, SaveButton, SectionCard, Select, Textarea, Toggle, ToastHost, useAsync, useToast } from "@/components/admin/ui";
import type { IntegrationStatus } from "@/admin/types";
import { CERT_ROLES, type CertRole, type CertRule } from "@/lib/certifications";
import { formatNumber } from "@/lib/utils";

const ROLE_LABEL: Record<CertRole, string> = { student: "學員", ta: "助教", instructor: "講師", admin: "管理員" };

const INTEGRATIONS: { key: keyof Omit<IntegrationStatus, "mode" | "database">; label: string; env: string; doc: string }[] = [
  { key: "discordLogin", label: "Discord 登入", env: "DISCORD_CLIENT_ID / DISCORD_CLIENT_SECRET", doc: "OAuth 流程與 redirect URI" },
  { key: "stream", label: "Cloudflare Stream", env: "CF_ACCOUNT_ID / CF_STREAM_API_TOKEN / CF_STREAM_CUSTOMER_CODE", doc: "影片直傳與播放" },
  { key: "r2", label: "Cloudflare R2", env: "R2_ACCOUNT_ID / R2_ACCESS_KEY_ID / R2_SECRET_ACCESS_KEY / R2_BUCKET", doc: "附件預簽名上傳" },
  { key: "instancer", label: "靶機 Instancer", env: "INSTANCER_URL / INSTANCER_SECRET", doc: "每人一份 Docker 環境" },
  { key: "webhook", label: "Discord Webhook", env: "DISCORD_WEBHOOK_URL", doc: "新問題、First Blood 通知" },
  { key: "sentry", label: "Sentry 錯誤監控", env: "SENTRY_DSN / NEXT_PUBLIC_SENTRY_DSN", doc: "線上 500 與未捕捉錯誤" },
];
export function SettingsAdmin() {
  const api = getAdminApi();
  const toast = useToast((s) => s.push);
  const status = useAsync(() => api.status());
  const [draft, setDraft] = useState<AdminSettings | null>(null);
  const [saving, setSaving] = useState(false);
  const [settling, setSettling] = useState(false);
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
            <Field label="週榜起算日" hint="依台北時間凌晨起算，跟伺服器時區無關">
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

        <SectionCard
          title="本週挑戰"
          desc="填題目 slug 就會置頂在首頁與題庫。名次照「這一週第一次解出」的時間算，上週解掉的人不佔名額。"
        >
          <div className="grid gap-4 sm:grid-cols-[1fr_140px]">
            <Field label="題目 slug" hint="留空就整個區塊不出現">
              <Input
                value={draft.weekly.slug}
                onChange={(e) => setDraft({ ...draft, weekly: { ...draft.weekly, slug: e.target.value.trim() } })}
                placeholder="sqli-login"
                className="font-mono"
              />
            </Field>
            <Field label="前三名加分 XP">
              <Input
                type="number"
                min={0}
                value={draft.weekly.bonusXp}
                onChange={(e) => setDraft({ ...draft, weekly: { ...draft.weekly, bonusXp: Math.max(0, Number(e.target.value)) } })}
                className="font-mono"
              />
            </Field>
          </div>
          <Field label="說明文字" className="mt-4">
            <Textarea
              value={draft.weekly.note}
              onChange={(e) => setDraft({ ...draft, weekly: { ...draft.weekly, note: e.target.value } })}
              maxLength={300}
            />
          </Field>

          <div className="mt-4 flex flex-wrap items-center gap-3 border-t border-white/[0.06] pt-4">
            <Button
              type="button"
              variant="outline"
              size="md"
              disabled={settling || !draft.weekly.slug}
              onClick={async () => {
                setSettling(true);
                try {
                  const r = await api.weekly.settle();
                  toast(r.message, r.ok ? "ok" : "info");
                } finally {
                  setSettling(false);
                }
              }}
            >
              <Megaphone size={14} />
              {settling ? "結算中" : "結算本週並公告"}
            </Button>
            <p className="text-[12px] leading-relaxed text-fg-3">
              發前三名的加分並貼 Discord 戰報。同一週重複按不會重複發分。要自動化就用 GitHub Actions 定時打
              <span className="font-mono"> POST /api/admin/weekly/settle</span>。
            </p>
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

        <SectionCard
          title="學員認證"
          desc="企劃書的三級認證，依完成的課程與題目認定，跟上面的 XP 階級無關。留白的欄位代表不檢查這一項。"
        >
          <div className="flex flex-col gap-3">
            {draft.certifications.map((c, i) => {
              const patch = (next: Partial<CertRule>) =>
                setDraft({ ...draft, certifications: draft.certifications.map((x, k) => (k === i ? { ...x, ...next } : x)) });
              const patchReq = (next: Partial<CertRule["requires"]>) => patch({ requires: { ...c.requires, ...next } });
              // 空字串要變成 undefined，不然存進去的 0 會被當成「需要 0 題」而永遠成立
              const num = (v: string) => (v.trim() === "" ? undefined : Math.max(0, Number(v)));

              return (
                <div key={c.id} className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4">
                  <div className="grid grid-cols-[28px_1fr_1fr_96px] items-center gap-2">
                    <span className="clip-hex h-6 w-6" style={{ background: c.color }} />
                    <Input value={c.name} onChange={(e) => patch({ name: e.target.value })} />
                    <Input value={c.en} onChange={(e) => patch({ en: e.target.value })} className="font-mono" />
                    <Input value={c.color} onChange={(e) => patch({ color: e.target.value })} className="font-mono" />
                  </div>
                  <div className="mt-2 grid gap-2 sm:grid-cols-2">
                    <Field label="能力指標">
                      <Input value={c.blurb} onChange={(e) => patch({ blurb: e.target.value })} />
                    </Field>
                    <Field label="對應競賽目標">
                      <Input value={c.goal} onChange={(e) => patch({ goal: e.target.value })} />
                    </Field>
                  </div>
                  <div className="mt-2 grid gap-2 sm:grid-cols-4">
                    <Field label="完課路徑數">
                      <Input
                        type="number"
                        min={0}
                        value={c.requires.trackCount ?? ""}
                        onChange={(e) => patchReq({ trackCount: num(e.target.value) })}
                        className="font-mono"
                      />
                    </Field>
                    <Field label="完成課程數">
                      <Input
                        type="number"
                        min={0}
                        value={c.requires.lessons ?? ""}
                        onChange={(e) => patchReq({ lessons: num(e.target.value) })}
                        className="font-mono"
                      />
                    </Field>
                    <Field label="解題數">
                      <Input
                        type="number"
                        min={0}
                        value={c.requires.solves ?? ""}
                        onChange={(e) => patchReq({ solves: num(e.target.value) })}
                        className="font-mono"
                      />
                    </Field>
                    <Field label="角色至少">
                      <Select
                        value={c.requires.role ?? ""}
                        onChange={(e) => patchReq({ role: (e.target.value || undefined) as CertRole | undefined })}
                      >
                        <option value="">不限</option>
                        {CERT_ROLES.map((r) => (
                          <option key={r} value={r}>
                            {ROLE_LABEL[r]}
                          </option>
                        ))}
                      </Select>
                    </Field>
                  </div>
                  <Field label="指定路徑" hint="填 slug，用逗號分隔，例如 web-security, pwnable" className="mt-2">
                    <Input
                      value={(c.requires.tracks ?? []).join(", ")}
                      onChange={(e) =>
                        patchReq({
                          tracks: e.target.value
                            .split(",")
                            .map((s) => s.trim())
                            .filter(Boolean),
                        })
                      }
                      className="font-mono"
                    />
                  </Field>
                </div>
              );
            })}
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
