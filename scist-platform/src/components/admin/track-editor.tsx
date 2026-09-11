"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { nanoid } from "nanoid";
import { getAdminApi } from "@/admin/api";
import type { AdminTrack } from "@/admin/types";
import { useInstructors } from "@/components/admin/use-instructors";
import { Icon, TRACK_ICONS } from "@/components/ui/icon";
import {
  ConfirmDelete,
  Field,
  Input,
  LinkBack,
  PageTitle,
  Repeater,
  SaveButton,
  SectionCard,
  Select,
  StatusSelect,
  TagInput,
  ToastHost,
  UnsavedPill,
  slugify,
  useSaveShortcut,
  useToast,
  useUnsavedGuard,
} from "@/components/admin/ui";
import { can } from "@/lib/permissions";
import { useProgress } from "@/store/progress";
import { cn } from "@/lib/utils";

const COLORS = ["#a4f13b", "#4da3ff", "#3ee8d5", "#b983ff", "#ff6fb5", "#ffb84d", "#ff5e5e"];
const LEVELS = ["入門友善", "需數學基礎", "中階", "進階", "全員必修"];

function blank(): AdminTrack {
  return {
    id: nanoid(10),
    slug: "",
    name: "",
    en: "",
    tagline: "",
    icon: "Puzzle",
    color: "#a4f13b",
    level: "入門友善",
    difficulty: "easy",
    outcome: "",
    syllabus: [],
    instructorId: null,
    sortOrder: 99,
    status: "draft",
    modules: [{ id: nanoid(10), title: "第一章", sortOrder: 0 }],
  };
}

export function TrackEditor({ id }: { id?: string }) {
  const api = getAdminApi();
  const router = useRouter();
  const toast = useToast((s) => s.push);
  const [initial] = useState<AdminTrack | null>(() => (id ? null : blank()));
  const [draft, setDraft] = useState<AdminTrack | null>(initial);
  const [baseline, setBaseline] = useState<string | null>(initial ? JSON.stringify(initial) : null);
  const [saving, setSaving] = useState(false);
  const [missing, setMissing] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);
  const instructors = useInstructors();
  // 砍一條路徑會連動底下所有課程，只有管理員能做
  const mayDelete = can(useProgress((s) => s.role), "track.delete");

  useEffect(() => {
    if (!id) return;
    api.tracks.list().then((list) => {
      const t = list.find((x) => x.id === id);
      if (t) {
        setDraft(t);
        setBaseline(JSON.stringify(t));
      } else setMissing(true);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const dirty = draft !== null && baseline !== null && JSON.stringify(draft) !== baseline;
  useUnsavedGuard(dirty && !saving);
  useSaveShortcut(() => formRef.current?.requestSubmit());

  if (missing) return <p className="text-fg-3">找不到這條路徑。</p>;
  if (!draft) return <p className="text-fg-3">載入中</p>;

  const patch = (p: Partial<AdminTrack>) => setDraft({ ...draft, ...p });

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!draft.name.trim() || !draft.slug.trim()) return toast("名稱與網址代稱是必填", "err");
    if (draft.modules.length === 0) return toast("至少要有一個章節", "err");
    setSaving(true);
    try {
      await api.tracks.save({ ...draft, modules: draft.modules.map((m, i) => ({ ...m, sortOrder: i })) });
      toast("已儲存");
      router.push("/admin/tracks");
    } catch (err) {
      toast(err instanceof Error ? err.message : "儲存失敗", "err");
    } finally {
      setSaving(false);
    }
  };

  return (
    <form ref={formRef} onSubmit={submit}>
      <LinkBack href="/admin/tracks">學習路徑</LinkBack>
      <PageTitle
        kicker={id ? "EDIT TRACK" : "NEW TRACK"}
        title={id ? draft.name || "編輯路徑" : "新增學習路徑"}
        actions={
          <>
            {id && mayDelete ? (
              <ConfirmDelete
                onConfirm={async () => {
                  await api.tracks.remove(draft.id);
                  toast("已刪除");
                  router.push("/admin/tracks");
                }}
              />
            ) : null}
            <UnsavedPill dirty={dirty} />
            <SaveButton saving={saving} />
          </>
        }
      />

      <div className="grid gap-6 xl:grid-cols-[1fr_360px]">
        <div className="flex flex-col gap-6">
          <SectionCard title="基本資料">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="名稱" required>
                <Input
                  value={draft.name}
                  onChange={(e) => patch({ name: e.target.value, slug: draft.slug || slugify(draft.en || e.target.value) })}
                  placeholder="網頁安全"
                />
              </Field>
              <Field label="英文名" required>
                <Input value={draft.en} onChange={(e) => patch({ en: e.target.value, slug: draft.slug || slugify(e.target.value) })} placeholder="Web Security" />
              </Field>
              <Field label="網址代稱" hint={"前台路徑會是 /learn/" + (draft.slug || "…")} required>
                <Input value={draft.slug} onChange={(e) => patch({ slug: slugify(e.target.value) })} placeholder="web-security" className="font-mono" />
              </Field>
              <Field label="講師">
                <Select value={draft.instructorId ?? ""} onChange={(e) => patch({ instructorId: e.target.value || null })}>
                  <option value="">未指定</option>
                  {instructors.map((i) => (
                    <option key={i.id} value={i.id}>
                      {i.name} @{i.handle}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="一句話標語" className="sm:col-span-2">
                <Input value={draft.tagline} onChange={(e) => patch({ tagline: e.target.value })} placeholder="看得懂 request，就不怕任何網頁題。" />
              </Field>
              <Field label="目標成果" className="sm:col-span-2">
                <Input value={draft.outcome} onChange={(e) => patch({ outcome: e.target.value })} placeholder="MyFirstCTF Web 題全解" />
              </Field>
              <Field label="大綱關鍵字" hint="會顯示在路徑卡片上，按 Enter 新增" className="sm:col-span-2">
                <TagInput value={draft.syllabus} onChange={(v) => patch({ syllabus: v })} />
              </Field>
              <Field label="程度標籤">
                <Select value={draft.level} onChange={(e) => patch({ level: e.target.value })}>
                  {LEVELS.map((l) => (
                    <option key={l}>{l}</option>
                  ))}
                </Select>
              </Field>
              <Field label="整體難度">
                <Select value={draft.difficulty} onChange={(e) => patch({ difficulty: e.target.value as AdminTrack["difficulty"] })}>
                  <option value="easy">簡單</option>
                  <option value="medium">中等</option>
                  <option value="hard">困難</option>
                  <option value="insane">瘋狂</option>
                </Select>
              </Field>
            </div>
          </SectionCard>

          <SectionCard title="外觀">
            <div className="flex flex-col gap-5">
              <div>
                <div className="mono-label mb-2">圖示</div>
                <div className="flex flex-wrap gap-2">
                  {TRACK_ICONS.map((ic) => (
                    <button
                      key={ic}
                      type="button"
                      onClick={() => patch({ icon: ic })}
                      className={cn(
                        "grid h-11 w-11 place-items-center rounded-lg border transition-colors",
                        draft.icon === ic ? "border-accent/60 bg-accent/10" : "border-white/[0.08] bg-white/[0.02] hover:border-white/20",
                      )}
                      aria-label={ic}
                    >
                      <Icon name={ic} size={18} style={{ color: draft.color }} />
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <div className="mono-label mb-2">主色</div>
                <div className="flex flex-wrap items-center gap-2">
                  {COLORS.map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => patch({ color: c })}
                      className={cn("clip-hex h-9 w-9 transition-transform", draft.color === c ? "scale-110 ring-2 ring-white/60" : "opacity-80 hover:opacity-100")}
                      style={{ background: c }}
                      aria-label={c}
                    />
                  ))}
                  <Input value={draft.color} onChange={(e) => patch({ color: e.target.value })} className="w-28 font-mono" />
                </div>
              </div>
            </div>
          </SectionCard>

          <SectionCard title="章節" desc="課程會掛在章節底下，順序就是前台顯示的順序。">
            <Repeater
              items={draft.modules}
              onChange={(modules) => patch({ modules })}
              make={() => ({ id: nanoid(10), title: "新章節", sortOrder: draft.modules.length })}
              addLabel="新增章節"
              render={(m, update) => <Input value={m.title} onChange={(e) => update({ title: e.target.value })} placeholder="第一章 · 你與伺服器之間" />}
            />
          </SectionCard>
        </div>

        <div className="flex flex-col gap-6">
          <SectionCard title="發布">
            <StatusSelect value={draft.status} onChange={(status) => patch({ status })} />
            <p className="mt-3 text-[12px] leading-relaxed text-fg-3">草稿不會出現在前台。封存會隱藏路徑但保留學員進度。</p>
          </SectionCard>

          <SectionCard title="預覽">
            <div className="card-solid overflow-hidden">
              <div className="h-20" style={{ background: "linear-gradient(135deg, " + draft.color + "3a, transparent)" }} />
              <div className="-mt-7 px-5 pb-5">
                <span className="clip-hex grid h-14 w-14 place-items-center" style={{ background: "linear-gradient(145deg, " + draft.color + ", " + draft.color + "66)" }}>
                  <span className="clip-hex grid h-[50px] w-[50px] place-items-center bg-bg-1">
                    <Icon name={draft.icon} size={20} style={{ color: draft.color }} />
                  </span>
                </span>
                <div className="display mt-3 text-[20px]">{draft.name || "路徑名稱"}</div>
                <div className="font-mono text-[10.5px] tracking-widest" style={{ color: draft.color }}>
                  {(draft.en || "TRACK").toUpperCase()}
                </div>
                <p className="mt-2 text-[13px] text-fg-2">{draft.tagline || "一句話標語"}</p>
              </div>
            </div>
          </SectionCard>
        </div>
      </div>
      <ToastHost />
    </form>
  );
}
