"use client";

import { useState } from "react";
import { nanoid } from "nanoid";
import { CalendarDays, Check, Flag, Layers, Link2, Loader2, Pencil, Plus, Unlink } from "lucide-react";
import { getAdminApi } from "@/admin/api";
import type { AdminInstructor } from "@/admin/types";
import { CATEGORY_META, type Category } from "@/data/challenges";
import { Icon } from "@/components/ui/icon";
import { Button, HexAvatar, buttonClass } from "@/components/ui/primitives";
import { ConfirmDelete, Drawer, Field, Input, PageTitle, Select, TagInput, Textarea, ToastHost, useAsync, useToast } from "@/components/admin/ui";
import { can } from "@/lib/permissions";
import { useProgress } from "@/store/progress";
import { cn } from "@/lib/utils";

const COLORS = ["#a4f13b", "#4da3ff", "#3ee8d5", "#b983ff", "#ff6fb5", "#ffb84d", "#ff5e5e"];
const DOMAINS = Object.keys(CATEGORY_META) as Category[];

function blank(sortOrder: number): AdminInstructor {
  return { id: nanoid(10), name: "", handle: "", role: "", domains: [], bio: "", creds: [], accent: "#a4f13b", userId: null, sortOrder };
}

export function InstructorsAdmin({ editId }: { editId?: string }) {
  const api = getAdminApi();
  const toast = useToast((s) => s.push);
  const list = useAsync(() => api.instructors.list());
  const tracks = useAsync(() => api.tracks.list());
  const challenges = useAsync(() => api.challenges.list());
  const events = useAsync(() => api.events.list());
  const users = useAsync(() => api.users.list());
  const [editing, setEditing] = useState<AdminInstructor | null>(null);
  const [dismissed, setDismissed] = useState(false);
  const [saving, setSaving] = useState(false);
  // 移除講師會把路徑、題目、活動上的欄位清空，只有管理員能做
  const mayDelete = can(useProgress((s) => s.role), "instructor.delete");

  // ?edit=<id> opens the drawer once the roster is loaded; closing it wins after that
  const current = editing ?? (editId && !dismissed ? (list.data?.find((i) => i.id === editId) ?? null) : null);
  const isNew = current ? !(list.data ?? []).some((i) => i.id === current.id) : false;

  const close = () => {
    setEditing(null);
    setDismissed(true);
  };
  const patch = (p: Partial<AdminInstructor>) => current && setEditing({ ...current, ...p });

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!current) return;
    if (!current.name.trim() || !current.handle.trim()) return toast("姓名與帳號是必填", "err");
    setSaving(true);
    try {
      await api.instructors.save({ ...current, handle: current.handle.replace(/^@/, "").trim() });
      await list.reload();
      toast(isNew ? "講師已新增" : "已儲存");
      close();
    } catch (err) {
      toast(err instanceof Error ? err.message : "儲存失敗", "err");
    } finally {
      setSaving(false);
    }
  };

  const staff = (users.data ?? []).filter((u) => u.role === "instructor" || u.role === "admin");

  return (
    <div>
      <PageTitle
        kicker="INSTRUCTORS"
        title="講師"
        desc="邀請講師來講課。講師會顯示在路徑頁、題目的出題者與活動主持。要讓講師能自己上架內容：請他先註冊或登入，到「學員與角色」設為講師，再回這裡綁定帳號。"
        actions={
          <Button size="sm" onClick={() => setEditing(blank((list.data?.length ?? 0) + 1))}>
            <Plus size={14} />
            新增講師
          </Button>
        }
      />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {(list.data ?? []).map((i) => {
          const nTracks = (tracks.data ?? []).filter((t) => t.instructorId === i.id).length;
          const nChallenges = (challenges.data ?? []).filter((c) => c.authorId === i.id).length;
          const nEvents = (events.data ?? []).filter((e) => e.hostId === i.id).length;
          const linked = i.userId ? (users.data ?? []).find((u) => u.id === i.userId) : null;
          return (
            <div key={i.id} className="card relative overflow-hidden p-5">
              <div className="absolute inset-x-0 top-0 h-[3px]" style={{ background: "linear-gradient(90deg, " + i.accent + ", transparent)" }} />
              <div className="flex items-start gap-4">
                <HexAvatar seed={i.handle} size={52} />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-baseline gap-x-2">
                    <span className="text-[17px] font-extrabold">{i.name}</span>
                    <span className="font-mono text-[12px] text-fg-3">@{i.handle}</span>
                  </div>
                  <div className="mt-0.5 text-[13px] text-fg-2">{i.role}</div>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {i.domains.map((d) => {
                      const m = CATEGORY_META[d as Category];
                      return (
                        <span key={d} className="flex items-center gap-1 rounded-md border px-1.5 py-px font-mono text-[10.5px]" style={{ color: m?.color ?? "#a9b6c6", borderColor: (m?.color ?? "#a9b6c6") + "55" }}>
                          {m ? <Icon name={m.icon} size={10} /> : null}
                          {m?.label ?? d}
                        </span>
                      );
                    })}
                  </div>
                </div>
                <button type="button" onClick={() => setEditing(i)} className="rounded-md p-2 text-fg-2 hover:bg-white/[0.06] hover:text-fg" aria-label="編輯">
                  <Pencil size={14} />
                </button>
              </div>
              <p className="mt-4 line-clamp-3 text-[13px] leading-relaxed text-fg-2">{i.bio || "還沒有簡介。"}</p>
              {i.creds.length ? (
                <ul className="mt-3 flex flex-wrap gap-x-3 gap-y-1 font-mono text-[11px] text-fg-3">
                  {i.creds.map((c) => (
                    <li key={c}>· {c}</li>
                  ))}
                </ul>
              ) : null}
              <div className="mt-4 grid grid-cols-3 gap-2 border-t border-white/[0.06] pt-4">
                {[
                  { Icon: Layers, n: nTracks, label: "負責路徑" },
                  { Icon: Flag, n: nChallenges, label: "出題" },
                  { Icon: CalendarDays, n: nEvents, label: "主持活動" },
                ].map((s) => (
                  <div key={s.label} className="flex items-center gap-2">
                    <s.Icon size={13} className="text-fg-3" />
                    <span className="font-mono text-[14px] font-bold">{s.n}</span>
                    <span className="text-[11px] text-fg-3">{s.label}</span>
                  </div>
                ))}
              </div>
              <div className={cn("mt-3 flex items-center gap-1.5 text-[12px]", linked ? "text-accent" : "text-fg-3")}>
                {linked ? <Link2 size={12} /> : <Unlink size={12} />}
                {linked ? "已綁定 @" + linked.handle + "，可以自己上架" : "尚未綁定登入帳號"}
              </div>
            </div>
          );
        })}
      </div>
      {list.data && list.data.length === 0 ? <p className="py-10 text-center text-[13px] text-fg-3">還沒有講師。</p> : null}

      <Drawer
        open={Boolean(current)}
        onClose={close}
        title={current ? (isNew ? "新增講師" : current.name) : ""}
        width={560}
        footer={
          current ? (
            <div className="flex flex-wrap items-center justify-between gap-3">
              {!isNew && mayDelete ? (
                <ConfirmDelete
                  onConfirm={async () => {
                    await api.instructors.remove(current.id);
                    await list.reload();
                    toast("已移除，路徑與題目上的講師欄位已清空");
                    close();
                  }}
                  label="移除講師"
                />
              ) : (
                <span />
              )}
              <div className="flex gap-2">
                <Button variant="ghost" size="md" onClick={close}>
                  取消
                </Button>
                {/* lives outside the form (drawer footer), so it submits by form id */}
                <button type="submit" form="instructor-form" disabled={saving} className={buttonClass("primary", "md")}>
                  {saving ? <Loader2 size={15} className="animate-spin" /> : <Check size={15} strokeWidth={3} />}
                  儲存
                </button>
              </div>
            </div>
          ) : null
        }
      >
        {current ? (
          <form id="instructor-form" onSubmit={save} className="grid gap-4 sm:grid-cols-2">
            <Field label="姓名" required>
              <Input value={current.name} onChange={(e) => patch({ name: e.target.value })} placeholder="林則安" />
            </Field>
            <Field label="帳號 handle" required hint="顯示成 @handle">
              <Input value={current.handle} onChange={(e) => patch({ handle: e.target.value })} placeholder="n0ir" className="font-mono" />
            </Field>
            <Field label="頭銜" className="sm:col-span-2">
              <Input value={current.role} onChange={(e) => patch({ role: e.target.value })} placeholder="Web / 平台核心講師" />
            </Field>
            <div className="sm:col-span-2">
              <div className="mono-label mb-2">專長領域</div>
              <div className="flex flex-wrap gap-1.5">
                {DOMAINS.map((d) => {
                  const m = CATEGORY_META[d];
                  const on = current.domains.includes(d);
                  return (
                    <button
                      key={d}
                      type="button"
                      onClick={() => patch({ domains: on ? current.domains.filter((x) => x !== d) : [...current.domains, d] })}
                      className={cn("flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-[12.5px] font-bold transition-colors", on ? "border-white/20 bg-white/[0.08] text-fg" : "border-white/[0.08] text-fg-3 hover:text-fg")}
                    >
                      <Icon name={m.icon} size={12} style={{ color: m.color }} />
                      {m.label}
                    </button>
                  );
                })}
              </div>
            </div>
            <Field label="簡介" hint="一到兩句，顯示在路徑頁與關於頁" className="sm:col-span-2">
              <Textarea value={current.bio} onChange={(e) => patch({ bio: e.target.value })} rows={3} placeholder="把每一個 HTTP request 拆開講給你聽。" />
            </Field>
            <Field label="經歷" hint="輸入後按 Enter" className="sm:col-span-2">
              <TagInput value={current.creds} onChange={(creds) => patch({ creds })} placeholder="HITCON CTF 決賽隊員" />
            </Field>
            <div className="sm:col-span-2">
              <div className="mono-label mb-2">代表色</div>
              <div className="flex flex-wrap items-center gap-2">
                {COLORS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => patch({ accent: c })}
                    className={cn("clip-hex h-8 w-8 transition-transform", current.accent === c ? "scale-110 ring-2 ring-white/60" : "opacity-80 hover:opacity-100")}
                    style={{ background: c }}
                    aria-label={c}
                  />
                ))}
                <Input value={current.accent} onChange={(e) => patch({ accent: e.target.value })} className="w-28 font-mono" />
              </div>
            </div>
            <Field label="綁定登入帳號" hint={staff.length ? "只列出角色是講師或管理員的帳號" : "還沒有講師或管理員角色的帳號，先到「學員與角色」設定"}>
              <Select value={current.userId ?? ""} onChange={(e) => patch({ userId: e.target.value || null })}>
                <option value="">未綁定</option>
                {staff.map((u) => (
                  <option key={u.id} value={u.id}>
                    @{u.handle}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="排序" hint="數字小的排前面">
              <Input type="number" min={0} value={current.sortOrder} onChange={(e) => patch({ sortOrder: Math.max(0, Number(e.target.value)) })} />
            </Field>
          </form>
        ) : null}
      </Drawer>

      <p className="mt-6 font-mono text-[11.5px] text-fg-3">
        {api.mode === "local" ? "本機模式：講師名單存在這台瀏覽器。" : "講師資料會直接寫入資料庫，前台的路徑頁與關於頁會同步。"}
      </p>
      <ToastHost />
    </div>
  );
}
