"use client";

import { useState } from "react";
import { nanoid } from "nanoid";
import { Calendar, MapPin, Pencil, Plus, Users, X } from "lucide-react";
import { getAdminApi } from "@/admin/api";
import type { AdminEvent, Status } from "@/admin/types";
import { EVENT_META, type EventType } from "@/data/events";
import { useInstructors } from "@/components/admin/use-instructors";
import { Icon } from "@/components/ui/icon";
import { Button, buttonClass, ProgressBar } from "@/components/ui/primitives";
import {
  ConfirmDelete,
  Field,
  Input,
  PageTitle,
  SaveButton,
  Select,
  StatusBadge,
  StatusSelect,
  TagInput,
  Textarea,
  ToastHost,
  useAsync,
  useToast,
} from "@/components/admin/ui";
import { cn, formatDateTime } from "@/lib/utils";

function blank(): AdminEvent {
  const d = new Date();
  d.setDate(d.getDate() + 7);
  d.setHours(20, 0, 0, 0);
  return {
    id: nanoid(10),
    type: "live",
    title: "",
    summary: "",
    startsAt: d.toISOString(),
    durationMin: 90,
    mode: "online",
    location: "Discord · stage 頻道",
    hostId: null,
    capacity: 100,
    baseRegistered: 0,
    tags: [],
    status: "draft",
  };
}

/**
 * Deleting an event drops its registrations. The server answers 409 and names
 * the count; only retry with force after the person confirms.
 */
async function deleteWithLearnerWarning(remove: (force?: boolean) => Promise<void>) {
  try {
    await remove();
    return true;
  } catch (e) {
    const msg = e instanceof Error ? e.message : "";
    if (!msg.includes("學員紀錄")) throw e;
    if (!window.confirm(msg + "\n\n仍要永久刪除嗎？")) return false;
    await remove(true);
    return true;
  }
}

function toLocalInput(iso: string) {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate()) + "T" + pad(d.getHours()) + ":" + pad(d.getMinutes());
}

export function EventsAdmin() {
  const api = getAdminApi();
  const toast = useToast((s) => s.push);
  const events = useAsync(() => api.events.list());
  const [status, setStatus] = useState<"all" | Status>("all");
  const visible = (events.data ?? []).filter((e) => status === "all" || e.status === status);
  const [editing, setEditing] = useState<AdminEvent | null>(null);
  const [saving, setSaving] = useState(false);
  const instructors = useInstructors();

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editing) return;
    if (!editing.title.trim()) return toast("活動名稱是必填", "err");
    setSaving(true);
    try {
      await api.events.save(editing);
      await events.reload();
      toast("已儲存");
      setEditing(null);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <PageTitle
        kicker="EVENTS"
        title="活動"
        desc="Bug 診療室、講師直播、工作坊、SCIST 盃。報名人數會顯示在前台，滿了會自動關閉報名。草稿與封存只會隱藏；要從這份清單拿掉，請進編輯後永久刪除。"
        actions={
          <Button size="sm" onClick={() => setEditing(blank())}>
            <Plus size={14} />
            新增活動
          </Button>
        }
      />

      <div className="mb-5 flex rounded-lg border border-white/[0.08] bg-bg-0 p-0.5 w-fit">
        {(["all", "published", "draft", "archived"] as const).map((s) => (
          <button
            key={s}
            onClick={() => setStatus(s)}
            className={cn("rounded-md px-2.5 py-1 text-[12px] font-bold", status === s ? "bg-white/[0.1] text-fg" : "text-fg-3")}
          >
            {s === "all" ? "全部" : s === "published" ? "已發布" : s === "draft" ? "草稿" : "封存"}
          </button>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {visible.length === 0 ? <p className="text-[13px] text-fg-3 lg:col-span-2">這個狀態底下沒有活動。</p> : null}
        {visible.map((e) => {
          const meta = EVENT_META[e.type];
          const host = instructors.find((i) => i.id === e.hostId);
          return (
            <div key={e.id} className="card flex gap-4 p-5">
              <span className="clip-hex grid h-12 w-12 shrink-0 place-items-center" style={{ background: meta.color + "22" }}>
                <Icon name={meta.icon} size={19} style={{ color: meta.color }} />
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-mono text-[10.5px] tracking-widest" style={{ color: meta.color }}>
                    {meta.label.toUpperCase()}
                  </span>
                  <span className="rounded border border-white/[0.08] px-1.5 py-px text-[10.5px] text-fg-3">{e.mode === "online" ? "線上" : "線下"}</span>
                  <StatusBadge status={e.status} />
                </div>
                <div className="mt-1.5 text-[16px] font-extrabold">{e.title}</div>
                <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 font-mono text-[11.5px] text-fg-3">
                  <span className="flex items-center gap-1">
                    <Calendar size={11} />
                    {formatDateTime(e.startsAt)} · {e.durationMin} 分
                  </span>
                  <span className="flex items-center gap-1">
                    <MapPin size={11} />
                    {e.location}
                  </span>
                  {host ? <span>@{host.handle}</span> : null}
                </div>
                <div className="mt-3 flex items-center gap-3">
                  <ProgressBar value={e.baseRegistered / e.capacity} height={4} color={meta.color} className="max-w-[200px]" />
                  <span className="flex items-center gap-1 font-mono text-[11px] text-fg-3">
                    <Users size={11} />
                    {e.baseRegistered}/{e.capacity}
                  </span>
                </div>
              </div>
              <button onClick={() => setEditing(e)} className="self-start rounded-md p-2 text-fg-2 hover:bg-white/[0.06] hover:text-fg" aria-label="編輯">
                <Pencil size={14} />
              </button>
            </div>
          );
        })}
      </div>

      {editing ? (
        <div className="fixed inset-0 z-[90] grid place-items-center overflow-y-auto bg-bg-0/70 p-4 backdrop-blur-sm" onClick={() => setEditing(null)}>
          <form onSubmit={save} className="card my-8 w-full max-w-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between border-b border-white/[0.06] px-6 py-4">
              <div className="text-[16px] font-extrabold">{editing.title || "活動"}</div>
              <button type="button" onClick={() => setEditing(null)} className="text-fg-3 hover:text-fg" aria-label="關閉">
                <X size={18} />
              </button>
            </div>
            <div className="grid gap-4 p-6 sm:grid-cols-2">
              <Field label="類型">
                <Select value={editing.type} onChange={(e) => setEditing({ ...editing, type: e.target.value as EventType })}>
                  {(Object.keys(EVENT_META) as EventType[]).map((t) => (
                    <option key={t} value={t}>
                      {EVENT_META[t].label}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="主持">
                <Select value={editing.hostId ?? ""} onChange={(e) => setEditing({ ...editing, hostId: e.target.value || null })}>
                  <option value="">未指定</option>
                  {instructors.map((i) => (
                    <option key={i.id} value={i.id}>
                      {i.name} @{i.handle}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="名稱" required className="sm:col-span-2">
                <Input value={editing.title} onChange={(e) => setEditing({ ...editing, title: e.target.value })} placeholder="Bug 診療室 · 台南場" />
              </Field>
              <Field label="說明" className="sm:col-span-2">
                <Textarea value={editing.summary} onChange={(e) => setEditing({ ...editing, summary: e.target.value })} rows={3} />
              </Field>
              <Field label="開始時間">
                <Input type="datetime-local" value={toLocalInput(editing.startsAt)} onChange={(e) => setEditing({ ...editing, startsAt: new Date(e.target.value).toISOString() })} />
              </Field>
              <Field label="長度（分鐘）">
                <Input type="number" min={15} value={editing.durationMin} onChange={(e) => setEditing({ ...editing, durationMin: Number(e.target.value) })} />
              </Field>
              <Field label="形式">
                <Select value={editing.mode} onChange={(e) => setEditing({ ...editing, mode: e.target.value as AdminEvent["mode"] })}>
                  <option value="online">線上</option>
                  <option value="offline">線下</option>
                </Select>
              </Field>
              <Field label="地點">
                <Input value={editing.location} onChange={(e) => setEditing({ ...editing, location: e.target.value })} />
              </Field>
              <Field label="名額">
                <Input type="number" min={1} value={editing.capacity} onChange={(e) => setEditing({ ...editing, capacity: Number(e.target.value) })} />
              </Field>
              <Field label="初始報名數" hint="示範用，會和真實報名數相加">
                <Input type="number" min={0} value={editing.baseRegistered} onChange={(e) => setEditing({ ...editing, baseRegistered: Number(e.target.value) })} />
              </Field>
              <Field label="標籤" className="sm:col-span-2">
                <TagInput value={editing.tags} onChange={(tags) => setEditing({ ...editing, tags })} />
              </Field>
              <div className="sm:col-span-2">
                <div className="mono-label mb-2">狀態</div>
                <StatusSelect value={editing.status} onChange={(status) => setEditing({ ...editing, status })} />
                <p className="mt-3 text-[12px] leading-relaxed text-fg-3">
                  草稿與封存只會讓前台看不到，活動還留在清單裡。永久刪除會把活動拿掉；已經有人報名時會先說明，確認後才真的刪，報名會一起消失。
                </p>
              </div>
            </div>
            <div className="flex items-center justify-between border-t border-white/[0.06] px-6 py-4">
              {(events.data ?? []).some((x) => x.id === editing.id) ? (
                <ConfirmDelete
                  label="永久刪除"
                  onConfirm={async () => {
                    try {
                      if (!(await deleteWithLearnerWarning((force) => api.events.remove(editing.id, force)))) return;
                    } catch (err) {
                      toast(err instanceof Error ? err.message : "刪除失敗", "err");
                      return;
                    }
                    await events.reload();
                    setEditing(null);
                    toast("已刪除");
                  }}
                />
              ) : (
                <span />
              )}
              <div className="flex gap-2">
                <button type="button" onClick={() => setEditing(null)} className={buttonClass("ghost", "md")}>
                  取消
                </button>
                <SaveButton saving={saving} />
              </div>
            </div>
          </form>
        </div>
      ) : null}
      <ToastHost />
    </div>
  );
}
