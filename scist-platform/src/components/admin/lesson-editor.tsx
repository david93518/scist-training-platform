"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { nanoid } from "nanoid";
import { Clock, ExternalLink, ListChecks, Zap } from "lucide-react";
import { getAdminApi } from "@/admin/api";
import type { AdminChallenge, AdminLesson, AdminTrack } from "@/admin/types";
import type { ContentBlock, Checkpoint } from "@/data/tracks";
import { ContentBlocks } from "@/components/learn/content-blocks";
import { VideoField } from "@/components/admin/uploads";
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
  Textarea,
  ToastHost,
  UnsavedPill,
  slugify,
  useSaveShortcut,
  useToast,
  useUnsavedGuard,
} from "@/components/admin/ui";
import { useSettings } from "@/components/settings-provider";
import { cn } from "@/lib/utils";

const BLOCK_TYPES: { id: ContentBlock["type"]; label: string }[] = [
  { id: "p", label: "段落" },
  { id: "h", label: "小標題" },
  { id: "code", label: "程式碼" },
  { id: "list", label: "條列" },
  { id: "callout", label: "提示框" },
];

function makeBlock(type: ContentBlock["type"]): ContentBlock {
  switch (type) {
    case "h":
      return { type: "h", text: "" };
    case "code":
      return { type: "code", lang: "bash", lines: [""] };
    case "list":
      return { type: "list", items: [""] };
    case "callout":
      return { type: "callout", tone: "tip", text: "" };
    default:
      return { type: "p", text: "" };
  }
}

function blankLesson(track: AdminTrack | undefined, sortOrder: number, xp: number): AdminLesson {
  return {
    id: nanoid(12),
    trackId: track?.id ?? "",
    moduleId: track?.modules[0]?.id ?? "",
    slug: "",
    title: "",
    summary: "",
    durationSec: 900,
    xp,
    videoProvider: "none",
    videoId: null,
    videoStatus: "none",
    content: [{ type: "p", text: "" }],
    checkpoints: [],
    labSlug: null,
    sortOrder,
    status: "draft",
    updatedAt: new Date().toISOString(),
  };
}

export function LessonEditor({ id }: { id?: string }) {
  const api = getAdminApi();
  const router = useRouter();
  const toast = useToast((s) => s.push);

  const [tracks, setTracks] = useState<AdminTrack[]>([]);
  const [lessons, setLessons] = useState<AdminLesson[]>([]);
  const [challenges, setChallenges] = useState<AdminChallenge[]>([]);
  const [draft, setDraft] = useState<AdminLesson | null>(null);
  const [saving, setSaving] = useState(false);
  const [missing, setMissing] = useState(false);
  const [preview, setPreview] = useState(true);
  const [baseline, setBaseline] = useState<string | null>(null);
  const formRef = useRef<HTMLFormElement>(null);
  // 後台「XP 規則」的預設值，只影響新建的課程與檢查站
  const xpDefaults = useSettings().xp;

  useEffect(() => {
    Promise.all([api.tracks.list(), api.lessons.list(), api.challenges.list()]).then(([t, l, c]) => {
      setTracks(t);
      setLessons(l);
      setChallenges(c);
      if (id) {
        const found = l.find((x) => x.id === id);
        if (found) {
          setDraft(found);
          setBaseline(JSON.stringify(found));
        } else setMissing(true);
      } else {
        const first = t[0];
        const fresh = blankLesson(first, l.filter((x) => x.moduleId === first?.modules[0]?.id).length, xpDefaults.lessonDefault);
        setDraft(fresh);
        setBaseline(JSON.stringify(fresh));
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const track = useMemo(() => tracks.find((t) => t.id === draft?.trackId), [tracks, draft?.trackId]);

  const dirty = draft !== null && baseline !== null && JSON.stringify(draft) !== baseline;
  useUnsavedGuard(dirty && !saving);
  useSaveShortcut(() => formRef.current?.requestSubmit());


  if (missing) return <p className="text-fg-3">找不到這堂課。</p>;
  if (!draft) return <p className="text-fg-3">載入中</p>;

  const patch = (p: Partial<AdminLesson>) => setDraft({ ...draft, ...p });

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!draft.title.trim()) return toast("課名是必填", "err");
    if (!draft.slug.trim()) return toast("網址代稱是必填", "err");
    if (!draft.trackId || !draft.moduleId) return toast("要選一條路徑和章節", "err");
    if (lessons.some((l) => l.id !== draft.id && l.trackId === draft.trackId && l.slug === draft.slug)) {
      return toast("這條路徑已經有相同的網址代稱", "err");
    }
    if (draft.videoProvider !== "none" && !draft.videoId) return toast("選了影片來源但還沒放影片", "err");
    for (const [i, c] of draft.checkpoints.entries()) {
      if (!c.question.trim()) return toast("檢查站 " + (i + 1) + " 缺題目", "err");
      if (c.options.filter((o) => o.trim()).length < 2) return toast("檢查站 " + (i + 1) + " 至少要兩個選項", "err");
      if (!c.options[c.answer]?.trim()) return toast("檢查站 " + (i + 1) + " 的正確答案是空的", "err");
    }
    setSaving(true);
    try {
      const cleaned: AdminLesson = {
        ...draft,
        content: draft.content.filter((b) => {
          if (b.type === "code") return b.lines.some((l) => l.trim());
          if (b.type === "list") return b.items.some((l) => l.trim());
          return b.text.trim().length > 0;
        }),
        checkpoints: [...draft.checkpoints].sort((a, b) => a.at - b.at).map((c) => ({ ...c, options: c.options.filter((o) => o.trim()) })),
      };
      await api.lessons.save(cleaned);
      toast(id ? "已儲存" : "課程已建立");
      router.push("/admin/lessons");
    } catch (err) {
      toast(err instanceof Error ? err.message : "儲存失敗", "err");
    } finally {
      setSaving(false);
    }
  };

  const totalXp = draft.xp + draft.checkpoints.reduce((n, c) => n + c.xp, 0);

  return (
    <form ref={formRef} onSubmit={submit}>
      <LinkBack href="/admin/lessons">課程與影片</LinkBack>
      <PageTitle
        kicker={id ? "EDIT LESSON" : "NEW LESSON"}
        title={draft.title || (id ? "編輯課程" : "上架課程")}
        actions={
          <>
            <button type="button" onClick={() => setPreview((v) => !v)} className="hidden rounded-lg border border-white/[0.08] px-3 text-[12.5px] text-fg-2 hover:text-fg xl:block">
              {preview ? "隱藏預覽" : "顯示預覽"}
            </button>
            {id ? (
              <ConfirmDelete
                onConfirm={async () => {
                  await api.lessons.remove(draft.id);
                  toast("已刪除");
                  router.push("/admin/lessons");
                }}
              />
            ) : null}
            <UnsavedPill dirty={dirty} />
            <SaveButton saving={saving}>{draft.status === "published" ? "儲存並發布" : "儲存草稿"}</SaveButton>
          </>
        }
      />

      <div className={cn("grid gap-6", preview && "xl:grid-cols-[1fr_420px]")}>
        <div className="flex min-w-0 flex-col gap-6">
          <SectionCard title="基本資料">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="學習路徑" required>
                <Select
                  value={draft.trackId}
                  onChange={(e) => {
                    const t = tracks.find((x) => x.id === e.target.value);
                    patch({ trackId: e.target.value, moduleId: t?.modules[0]?.id ?? "" });
                  }}
                >
                  {tracks.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="章節" required>
                <Select value={draft.moduleId} onChange={(e) => patch({ moduleId: e.target.value })}>
                  {(track?.modules ?? []).map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.title}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="課名" required className="sm:col-span-2">
                <Input
                  value={draft.title}
                  onChange={(e) => patch({ title: e.target.value, slug: id ? draft.slug : slugify(e.target.value) || draft.slug })}
                  placeholder="SQL Injection 入門：一個引號的力量"
                />
              </Field>
              <Field label="網址代稱" hint={"前台路徑 /learn/" + (track?.slug ?? "…") + "/" + (draft.slug || "…")} required>
                <Input value={draft.slug} onChange={(e) => patch({ slug: slugify(e.target.value) })} placeholder="sql-injection" className="font-mono" />
              </Field>
              <div className="grid grid-cols-2 gap-4">
                <Field label="長度（分鐘）">
                  <Input type="number" min={1} value={Math.round(draft.durationSec / 60)} onChange={(e) => patch({ durationSec: Math.max(1, Number(e.target.value)) * 60 })} />
                </Field>
                <Field label="完成 XP">
                  <Input type="number" min={0} value={draft.xp} onChange={(e) => patch({ xp: Math.max(0, Number(e.target.value)) })} />
                </Field>
              </div>
              <Field label="一句話摘要" hint="顯示在課程列表與播放器標題下方" className="sm:col-span-2">
                <Textarea value={draft.summary} onChange={(e) => patch({ summary: e.target.value })} rows={2} placeholder="SQL 注入原理、常見 payload、繞過認證、Parameterized Query 防禦。" />
              </Field>
            </div>
          </SectionCard>

          <SectionCard title="影片" desc="影片播放到檢查站的位置會自動暫停出題。沒有影片的課，檢查站會直接顯示在講義下方。">
            <VideoField
              lessonId={draft.id}
              provider={draft.videoProvider}
              videoId={draft.videoId}
              status={draft.videoStatus}
              onChange={(v) => patch(v)}
            />
          </SectionCard>

          <SectionCard title="講義內容" desc="用區塊組合。程式碼區塊會出現在播放器裡當作影片的替身畫面。">
            <Repeater
              items={draft.content}
              onChange={(content) => patch({ content })}
              make={() => makeBlock("p")}
              addLabel="新增區塊"
              render={(b, update) => (
                <div className="flex flex-col gap-3">
                  <div className="flex flex-wrap gap-1.5">
                    {BLOCK_TYPES.map((t) => (
                      <button
                        key={t.id}
                        type="button"
                        onClick={() => update(makeBlock(t.id) as Partial<ContentBlock>)}
                        className={cn(
                          "rounded-md border px-2.5 py-1 text-[12px] font-bold",
                          b.type === t.id ? "border-accent/60 bg-accent/10 text-accent" : "border-white/[0.08] text-fg-3 hover:text-fg",
                        )}
                      >
                        {t.label}
                      </button>
                    ))}
                  </div>
                  {b.type === "p" || b.type === "h" ? (
                    <Textarea value={b.text} onChange={(e) => update({ text: e.target.value } as Partial<ContentBlock>)} rows={b.type === "h" ? 1 : 3} placeholder={b.type === "h" ? "小標題" : "段落內容"} />
                  ) : null}
                  {b.type === "code" ? (
                    <div className="grid gap-3 sm:grid-cols-[140px_1fr]">
                      <Input value={b.lang} onChange={(e) => update({ lang: e.target.value } as Partial<ContentBlock>)} placeholder="bash / python / sql" className="font-mono" />
                      <Textarea
                        value={b.lines.join("\n")}
                        onChange={(e) => update({ lines: e.target.value.split("\n") } as Partial<ContentBlock>)}
                        rows={5}
                        className="font-mono text-[13px]"
                        placeholder={"SELECT * FROM users\nWHERE …"}
                      />
                    </div>
                  ) : null}
                  {b.type === "list" ? (
                    <Textarea value={b.items.join("\n")} onChange={(e) => update({ items: e.target.value.split("\n") } as Partial<ContentBlock>)} rows={4} placeholder={"一行一項"} />
                  ) : null}
                  {b.type === "callout" ? (
                    <div className="grid gap-3 sm:grid-cols-[140px_1fr]">
                      <Select value={b.tone} onChange={(e) => update({ tone: e.target.value } as Partial<ContentBlock>)}>
                        <option value="tip">小技巧</option>
                        <option value="warn">注意</option>
                        <option value="info">補充</option>
                      </Select>
                      <Textarea value={b.text} onChange={(e) => update({ text: e.target.value } as Partial<ContentBlock>)} rows={2} />
                    </div>
                  ) : null}
                </div>
              )}
            />
          </SectionCard>

          <SectionCard
            title="知識點檢查站"
            desc="影片播到指定百分比會暫停出題，答對才繼續。建議 2 到 3 個，分布在 30%、60%、90% 左右。"
            right={
              <span className="flex items-center gap-1.5 font-mono text-[12px] text-accent">
                <Zap size={12} />+{draft.checkpoints.reduce((n, c) => n + c.xp, 0)} XP
              </span>
            }
          >
            <Repeater
              items={draft.checkpoints}
              onChange={(checkpoints) => patch({ checkpoints })}
              make={(): Checkpoint => ({ at: Math.min(0.9, 0.3 * (draft.checkpoints.length + 1)), question: "", options: ["", "", "", ""], answer: 0, explain: "", xp: xpDefaults.checkpointDefault })}
              addLabel="新增檢查站"
              empty="還沒有檢查站。沒有檢查站的課看完就能完成。"
              render={(c, update) => (
                <div className="flex flex-col gap-3">
                  <div className="grid gap-3 sm:grid-cols-[120px_1fr_100px]">
                    <Field label="出現在">
                      <div className="flex h-10 items-center gap-2">
                        <Input type="number" min={5} max={98} value={Math.round(c.at * 100)} onChange={(e) => update({ at: Math.min(0.98, Math.max(0.05, Number(e.target.value) / 100)) })} />
                        <span className="text-[13px] text-fg-3">%</span>
                      </div>
                    </Field>
                    <Field label="題目" required>
                      <Input value={c.question} onChange={(e) => update({ question: e.target.value })} placeholder="為什麼 OR 1=1 能繞過登入？" />
                    </Field>
                    <Field label="XP">
                      <Input type="number" min={0} value={c.xp} onChange={(e) => update({ xp: Math.max(0, Number(e.target.value)) })} />
                    </Field>
                  </div>
                  <div className="grid gap-2 sm:grid-cols-2">
                    {c.options.map((o, oi) => (
                      <label key={oi} className={cn("flex items-center gap-2 rounded-lg border px-2.5 py-1.5", c.answer === oi ? "border-accent/60 bg-accent/[0.06]" : "border-white/[0.08]")}>
                        <input type="radio" name={"ans-" + c.question + oi} checked={c.answer === oi} onChange={() => update({ answer: oi })} className="accent-[#a4f13b]" />
                        <input
                          value={o}
                          onChange={(e) => update({ options: c.options.map((x, k) => (k === oi ? e.target.value : x)) })}
                          placeholder={"選項 " + String.fromCharCode(65 + oi)}
                          className="w-full bg-transparent text-[13px] outline-none placeholder:text-fg-3"
                        />
                      </label>
                    ))}
                  </div>
                  <Field label="解析" hint="答對後顯示，也是答錯時最有價值的一段話">
                    <Textarea value={c.explain} onChange={(e) => update({ explain: e.target.value })} rows={2} />
                  </Field>
                </div>
              )}
            />
          </SectionCard>

          <SectionCard title="隨堂實戰 Lab" desc="這一課學完馬上去打的題目。">
            <Select value={draft.labSlug ?? ""} onChange={(e) => patch({ labSlug: e.target.value || null })}>
              <option value="">這一課不配 Lab</option>
              {challenges.map((c) => (
                <option key={c.id} value={c.slug}>
                  {c.name} · {c.category} · {c.difficulty}
                </option>
              ))}
            </Select>
          </SectionCard>
        </div>

        {preview ? (
          <div className="flex flex-col gap-6 xl:sticky xl:top-24 xl:self-start">
            <SectionCard title="發布">
              <StatusSelect value={draft.status} onChange={(status) => patch({ status })} />
              <div className="mt-4 flex flex-col gap-2 text-[12.5px] text-fg-3">
                <div className="flex items-center gap-2">
                  <Clock size={12} /> {Math.round(draft.durationSec / 60)} 分鐘
                </div>
                <div className="flex items-center gap-2">
                  <ListChecks size={12} /> {draft.checkpoints.length} 個檢查站
                </div>
                <div className="flex items-center gap-2 text-accent">
                  <Zap size={12} /> 整堂可拿 {totalXp} XP
                </div>
              </div>
              {track && draft.slug ? (
                <Link href={"/learn/" + track.slug + "/" + draft.slug} target="_blank" className="mt-4 inline-flex items-center gap-1.5 text-[12.5px] text-fg-2 hover:text-accent">
                  <ExternalLink size={12} />
                  在前台開啟{api.mode === "local" ? "（本機模式只會看到既有內容）" : ""}
                </Link>
              ) : null}
            </SectionCard>

            <SectionCard title="講義預覽">
              <div className="max-h-[60vh] overflow-y-auto pr-1">
                <div className="mb-3 font-mono text-[11px] tracking-widest" style={{ color: track?.color }}>
                  {(track?.en ?? "TRACK").toUpperCase()}
                </div>
                <div className="display text-[20px]">{draft.title || "課名"}</div>
                <p className="mt-2 text-[13px] text-fg-2">{draft.summary || "摘要"}</p>
                <div className="mt-4 border-t border-white/[0.06] pt-4">
                  <ContentBlocks blocks={draft.content.filter((b) => (b.type === "code" ? b.lines.some(Boolean) : b.type === "list" ? b.items.some(Boolean) : b.text))} />
                </div>
              </div>
            </SectionCard>
          </div>
        ) : null}
      </div>
      <ToastHost />
    </form>
  );
}
