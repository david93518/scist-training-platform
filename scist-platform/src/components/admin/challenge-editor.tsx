"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { nanoid } from "nanoid";
import { KeyRound, Lock, ShieldCheck } from "lucide-react";
import { getAdminApi } from "@/admin/api";
import type { AdminChallenge, AdminFlag, AdminLesson, AdminTrack } from "@/admin/types";
import { CATEGORY_META, type Category, type Challenge } from "@/data/challenges";
import { useInstructors } from "@/components/admin/use-instructors";
import { ChallengeCard } from "@/components/challenges/challenge-card";
import { FilesField } from "@/components/admin/uploads";
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
  Textarea,
  Toggle,
  ToastHost,
  UnsavedPill,
  slugify,
  useSaveShortcut,
  useToast,
  useUnsavedGuard,
} from "@/components/admin/ui";
import { sha256Hex } from "@/lib/hash";

function blank(): AdminChallenge {
  return {
    id: nanoid(12),
    slug: "",
    name: "",
    category: "web",
    difficulty: "easy",
    kind: "challenge",
    blurb: "",
    description: [""],
    tags: [],
    authorId: null,
    tutorial: false,
    lessonRef: null,
    connectionType: "none",
    connectionValue: null,
    instanceImage: null,
    instancePort: null,
    instanceTtlMin: 120,
    baseSolves: 0,
    rating: 0,
    status: "draft",
    releasedAt: null,
    flags: [{ id: nanoid(8), flagId: "flag", label: "Flag", sha256: "", points: 100, plaintext: "" }],
    hints: [],
    files: [],
    updatedAt: new Date().toISOString(),
  };
}

/** live hash for a flag row while editing */
function FlagRow({ flag, update, isBox }: { flag: AdminFlag; update: (p: Partial<AdminFlag>) => void; isBox: boolean }) {
  const [hashed, setHashed] = useState("");
  const preview = flag.plaintext ? hashed : "";
  useEffect(() => {
    let alive = true;
    if (!flag.plaintext) return;
    sha256Hex(flag.plaintext.trim()).then((h) => {
      if (alive) {
        setHashed(h);
        update({ sha256: h });
      }
    });
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [flag.plaintext]);

  const hasStored = Boolean(flag.sha256) && !flag.plaintext;

  return (
    <div className="grid gap-3 sm:grid-cols-[110px_1fr_1fr_90px]">
      <Field label="種類">
        <Select value={flag.flagId} onChange={(e) => update({ flagId: e.target.value, label: e.target.value === "user" ? "User Flag" : e.target.value === "root" ? "Root Flag" : "Flag" })}>
          <option value="flag">flag</option>
          {isBox ? (
            <>
              <option value="user">user</option>
              <option value="root">root</option>
            </>
          ) : null}
        </Select>
      </Field>
      <Field label="顯示名稱">
        <Input value={flag.label} onChange={(e) => update({ label: e.target.value })} />
      </Field>
      <Field label="Flag 明文" hint={hasStored ? "已儲存雜湊；留空表示不變，輸入新值會覆蓋。" : "存檔時只留下 SHA-256。"}>
        <div className="relative">
          <Input value={flag.plaintext ?? ""} onChange={(e) => update({ plaintext: e.target.value })} placeholder={hasStored ? "（已設定）" : "SCIST{...}"} className="pr-9 font-mono" />
          <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-fg-3">{hasStored || preview ? <ShieldCheck size={15} className="text-accent" /> : <Lock size={14} />}</span>
        </div>
      </Field>
      <Field label="分數">
        <Input type="number" min={0} value={flag.points} onChange={(e) => update({ points: Math.max(0, Number(e.target.value)) })} />
      </Field>
      {(preview || flag.sha256) && (
        <div className="sm:col-span-4 -mt-1 truncate font-mono text-[10.5px] text-fg-3">sha256 · {preview || flag.sha256}</div>
      )}
    </div>
  );
}

export function ChallengeEditor({ id }: { id?: string }) {
  const api = getAdminApi();
  const router = useRouter();
  const toast = useToast((s) => s.push);

  const [all, setAll] = useState<AdminChallenge[]>([]);
  const [tracks, setTracks] = useState<AdminTrack[]>([]);
  const [lessons, setLessons] = useState<AdminLesson[]>([]);
  const [draft, setDraft] = useState<AdminChallenge | null>(null);
  const [saving, setSaving] = useState(false);
  const [missing, setMissing] = useState(false);
  const [baseline, setBaseline] = useState<string | null>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const instructors = useInstructors();

  useEffect(() => {
    Promise.all([api.challenges.list(), api.tracks.list(), api.lessons.list()]).then(([c, t, l]) => {
      setAll(c);
      setTracks(t);
      setLessons(l);
      if (id) {
        const found = c.find((x) => x.id === id || x.slug === id);
        if (found) {
          const loaded = { ...found, flags: found.flags.map((f) => ({ ...f, plaintext: "" })) };
          setDraft(loaded);
          setBaseline(JSON.stringify(loaded));
        } else setMissing(true);
      } else {
        const fresh = blank();
        setDraft(fresh);
        setBaseline(JSON.stringify(fresh));
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const previewCard: Challenge | null = useMemo(() => {
    if (!draft) return null;
    return {
      id: draft.id,
      slug: draft.slug || "preview",
      name: draft.name || "題目名稱",
      category: draft.category,
      difficulty: draft.difficulty,
      kind: draft.kind,
      blurb: draft.blurb || "一句話描述這題在考什麼。",
      description: draft.description,
      hints: draft.hints.map((h) => ({ id: h.id, text: h.text, cost: h.cost })),
      flags: draft.flags.map((f) => ({ id: f.flagId, label: f.label, sha256: f.sha256, points: f.points })),
      points: draft.flags.reduce((n, f) => n + f.points, 0),
      solves: draft.baseSolves,
      rating: draft.rating,
      authorId: draft.authorId ?? "",
      tags: draft.tags,
      releasedAt: draft.releasedAt ?? new Date().toISOString(),
    };
  }, [draft]);

  const dirty = draft !== null && baseline !== null && JSON.stringify(draft) !== baseline;
  useUnsavedGuard(dirty && !saving);
  useSaveShortcut(() => formRef.current?.requestSubmit());

  if (missing) return <p className="text-fg-3">找不到這題。</p>;
  if (!draft) return <p className="text-fg-3">載入中</p>;

  const patch = (p: Partial<AdminChallenge>) => setDraft({ ...draft, ...p });
  const points = draft.flags.reduce((n, f) => n + f.points, 0);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!draft.name.trim() || !draft.slug.trim()) return toast("題名與網址代稱是必填", "err");
    if (all.some((c) => c.id !== draft.id && c.slug === draft.slug)) return toast("網址代稱已被使用", "err");
    if (draft.flags.length === 0) return toast("至少要有一個 flag", "err");
    for (const f of draft.flags) if (!f.sha256) return toast("每個 flag 都要有明文（存檔只會留雜湊）", "err");
    if (draft.kind === "box" && !draft.flags.some((f) => f.flagId === "root")) return toast("靶機至少要有 root flag", "err");
    if (draft.connectionType !== "none" && !draft.instanceImage && !draft.connectionValue) return toast("有環境的題目要填 Docker 映像或固定連線資訊", "err");
    setSaving(true);
    try {
      await api.challenges.save({ ...draft, description: draft.description.filter((p) => p.trim()) });
      toast(id ? "已儲存" : "題目已建立");
      router.push("/admin/challenges");
    } catch (err) {
      toast(err instanceof Error ? err.message : "儲存失敗", "err");
    } finally {
      setSaving(false);
    }
  };

  return (
    <form ref={formRef} onSubmit={submit}>
      <LinkBack href="/admin/challenges">題庫</LinkBack>
      <PageTitle
        kicker={id ? "EDIT CHALLENGE" : "NEW CHALLENGE"}
        title={draft.name || (id ? "編輯題目" : "新增題目")}
        actions={
          <>
            {id ? (
              <ConfirmDelete
                onConfirm={async () => {
                  await api.challenges.remove(draft.id);
                  toast("已刪除");
                  router.push("/admin/challenges");
                }}
              />
            ) : null}
            <UnsavedPill dirty={dirty} />
            <SaveButton saving={saving}>{draft.status === "published" ? "儲存並發布" : "儲存草稿"}</SaveButton>
          </>
        }
      />

      <div className="grid gap-6 xl:grid-cols-[1fr_400px]">
        <div className="flex min-w-0 flex-col gap-6">
          <SectionCard title="基本資料">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="題名" required>
                <Input value={draft.name} onChange={(e) => patch({ name: e.target.value, slug: id ? draft.slug : slugify(e.target.value) || draft.slug })} placeholder="Login Bypass" />
              </Field>
              <Field label="網址代稱" hint={"/challenges/" + (draft.slug || "…")} required>
                <Input value={draft.slug} onChange={(e) => patch({ slug: slugify(e.target.value) })} className="font-mono" />
              </Field>
              <Field label="類別">
                <Select value={draft.category} onChange={(e) => patch({ category: e.target.value as Category })}>
                  {(Object.keys(CATEGORY_META) as Category[]).map((c) => (
                    <option key={c} value={c}>
                      {CATEGORY_META[c].label} · {CATEGORY_META[c].en}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="難度">
                <Select value={draft.difficulty} onChange={(e) => patch({ difficulty: e.target.value as AdminChallenge["difficulty"] })}>
                  <option value="easy">簡單 · 100</option>
                  <option value="medium">中等 · 250</option>
                  <option value="hard">困難 · 500</option>
                  <option value="insane">瘋狂 · 900</option>
                </Select>
              </Field>
              <Field label="型態" hint="靶機有 user 與 root 兩個 flag，需要 Docker 環境">
                <Select value={draft.kind} onChange={(e) => patch({ kind: e.target.value as AdminChallenge["kind"] })}>
                  <option value="challenge">一般題目</option>
                  <option value="box">靶機 Box</option>
                </Select>
              </Field>
              <Field label="出題者">
                <Select value={draft.authorId ?? ""} onChange={(e) => patch({ authorId: e.target.value || null })}>
                  <option value="">未指定</option>
                  {instructors.map((i) => (
                    <option key={i.id} value={i.id}>
                      {i.name} @{i.handle}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="一句話" hint="顯示在題目卡片上" className="sm:col-span-2">
                <Input value={draft.blurb} onChange={(e) => patch({ blurb: e.target.value })} placeholder="一個引號，換一張管理員的門票。" />
              </Field>
              <Field label="題目敘述" hint="空一行分段" className="sm:col-span-2">
                <Textarea value={draft.description.join("\n\n")} onChange={(e) => patch({ description: e.target.value.split(/\n{2,}/) })} rows={5} />
              </Field>
              <Field label="標籤" className="sm:col-span-2">
                <TagInput value={draft.tags} onChange={(v) => patch({ tags: v })} />
              </Field>
              <Field label="對應課程" className="sm:col-span-2">
                <Select value={draft.lessonRef ?? ""} onChange={(e) => patch({ lessonRef: e.target.value || null })}>
                  <option value="">無</option>
                  {lessons.map((l) => {
                    const t = tracks.find((x) => x.id === l.trackId);
                    const ref = (t?.slug ?? "?") + "/" + l.slug;
                    return (
                      <option key={l.id} value={ref}>
                        {t?.name} · {l.title}
                      </option>
                    );
                  })}
                </Select>
              </Field>
              <div className="sm:col-span-2">
                <Toggle checked={draft.tutorial} onChange={(v) => patch({ tutorial: v })} label="教學題" hint="題目頁會把 flag 直接印出來，給第一次使用的人走流程" />
              </div>
            </div>
          </SectionCard>

          <SectionCard
            title="Flag"
            desc="明文只在這個畫面存在，存檔後只剩 SHA-256。想改 flag 就重新輸入一次。"
            right={
              <span className="flex items-center gap-1.5 font-mono text-[12px] text-accent">
                <KeyRound size={12} />
                共 {points} 分
              </span>
            }
          >
            <Repeater
              items={draft.flags}
              onChange={(flags) => patch({ flags })}
              make={() => ({ id: nanoid(8), flagId: draft.kind === "box" ? "root" : "flag", label: draft.kind === "box" ? "Root Flag" : "Flag", sha256: "", points: 100, plaintext: "" })}
              addLabel="新增 flag"
              render={(f, update) => <FlagRow flag={f} update={update} isBox={draft.kind === "box"} />}
            />
          </SectionCard>

          <SectionCard title="提示" desc="依序解鎖，每則扣 XP。第一則便宜一點，最後一則幾乎是答案。">
            <Repeater
              items={draft.hints}
              onChange={(hints) => patch({ hints })}
              make={() => ({ id: nanoid(8), text: "", cost: 10 * (draft.hints.length + 1) })}
              addLabel="新增提示"
              empty="沒有提示也可以，但建議至少一則。"
              render={(h, update) => (
                <div className="grid gap-3 sm:grid-cols-[1fr_110px]">
                  <Textarea value={h.text} onChange={(e) => update({ text: e.target.value })} rows={2} placeholder="先在帳號欄輸入一個單引號，看看伺服器有沒有噴錯。" />
                  <Field label="扣 XP">
                    <Input type="number" min={0} value={h.cost} onChange={(e) => update({ cost: Math.max(0, Number(e.target.value)) })} />
                  </Field>
                </div>
              )}
            />
          </SectionCard>

          <SectionCard title="附件" desc="密碼學、逆向、鑑識題通常會附檔案。">
            <FilesField challengeId={draft.id} files={draft.files} onChange={(files) => patch({ files })} />
          </SectionCard>

          <SectionCard title="題目環境" desc="Web、Pwn、靶機需要一個能連的東西。填 Docker 映像會由 instancer 幫每個學員開一份；填固定連線資訊則所有人共用。">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="連線方式">
                <Select value={draft.connectionType} onChange={(e) => patch({ connectionType: e.target.value as AdminChallenge["connectionType"] })}>
                  <option value="none">不需要環境</option>
                  <option value="http">HTTP（瀏覽器開）</option>
                  <option value="nc">netcat</option>
                  <option value="ssh">SSH</option>
                </Select>
              </Field>
              <Field label="固定連線資訊" hint="沒有 Docker 映像時才用，例如 nc host 1337">
                <Input value={draft.connectionValue ?? ""} onChange={(e) => patch({ connectionValue: e.target.value || null })} className="font-mono" disabled={draft.connectionType === "none"} />
              </Field>
              <Field label="Docker 映像" hint="instancer 會 pull 這個映像。見 instancer/README.md">
                <Input value={draft.instanceImage ?? ""} onChange={(e) => patch({ instanceImage: e.target.value || null })} placeholder="ghcr.io/scist/sqli-login:latest" className="font-mono" disabled={draft.connectionType === "none"} />
              </Field>
              <div className="grid grid-cols-2 gap-4">
                <Field label="容器 Port">
                  <Input type="number" value={draft.instancePort ?? ""} onChange={(e) => patch({ instancePort: e.target.value ? Number(e.target.value) : null })} placeholder="80" disabled={draft.connectionType === "none"} />
                </Field>
                <Field label="存活（分鐘）">
                  <Input type="number" min={5} value={draft.instanceTtlMin} onChange={(e) => patch({ instanceTtlMin: Math.max(5, Number(e.target.value)) })} disabled={draft.connectionType === "none"} />
                </Field>
              </div>
            </div>
          </SectionCard>

          <SectionCard title="初始顯示數據" desc="剛上線的題目沒有解題紀錄。這兩個數字只用來讓卡片看起來不那麼空，會和真實數據相加。">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="基礎解題數">
                <Input type="number" min={0} value={draft.baseSolves} onChange={(e) => patch({ baseSolves: Math.max(0, Number(e.target.value)) })} />
              </Field>
              <Field label="評分（0 到 5）">
                <Input type="number" min={0} max={5} step={0.1} value={draft.rating} onChange={(e) => patch({ rating: Math.min(5, Math.max(0, Number(e.target.value))) })} />
              </Field>
            </div>
          </SectionCard>
        </div>

        <div className="flex flex-col gap-6 xl:sticky xl:top-24 xl:self-start">
          <SectionCard title="發布">
            <StatusSelect value={draft.status} onChange={(status) => patch({ status, releasedAt: status === "published" && !draft.releasedAt ? new Date().toISOString() : draft.releasedAt })} />
            <Field label="上線時間" className="mt-4" hint="可以排程未來時間，前台到時才會顯示">
              <Input
                type="datetime-local"
                value={draft.releasedAt ? draft.releasedAt.slice(0, 16) : ""}
                onChange={(e) => patch({ releasedAt: e.target.value ? new Date(e.target.value).toISOString() : null })}
              />
            </Field>
          </SectionCard>

          <SectionCard title="卡片預覽" desc="題庫裡看起來的樣子。">
            {previewCard ? (
              <div className="pointer-events-none">
                <ChallengeCard challenge={previewCard} />
              </div>
            ) : null}
          </SectionCard>
        </div>
      </div>
      <ToastHost />
    </form>
  );
}
