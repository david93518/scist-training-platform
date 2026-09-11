"use client";

import { useEffect, useState } from "react";
import { MessageSquare, ThumbsUp, Check, Send, ShieldCheck, Loader2, Lock, Pencil, Trash2, Reply } from "lucide-react";
import { HexAvatar, Button } from "@/components/ui/primitives";
import type { Answer, Question } from "@/data/questions";
import { api } from "@/lib/api";
import { can } from "@/lib/permissions";
import { useProgress, useHydrated } from "@/store/progress";
import { useFeatures } from "@/components/settings-provider";
import { useNow } from "@/lib/use-now";
import { cn, relativeTime } from "@/lib/utils";

const ROLE_STYLE: Record<string, string> = {
  講師: "text-accent border-accent/40 bg-accent/10",
  助教: "text-blue border-blue/40 bg-blue/10",
  學員: "text-fg-3 border-line bg-bg-3",
};

/** Vote pill. Read-only for guests and for locally-stored guest questions. */
function VoteButton({
  votes,
  voted,
  disabled,
  onVote,
  size = "md",
}: {
  votes: number;
  voted?: boolean;
  disabled?: boolean;
  onVote?: () => void;
  size?: "sm" | "md";
}) {
  const icon = size === "sm" ? 10 : 11;
  const content = (
    <>
      <ThumbsUp size={icon} className={voted ? "fill-current" : undefined} />
      {votes}
    </>
  );
  if (disabled || !onVote) {
    return <span className="flex items-center gap-1">{content}</span>;
  }
  return (
    <button
      type="button"
      onClick={onVote}
      aria-pressed={Boolean(voted)}
      className={cn(
        "flex items-center gap-1 rounded px-1.5 py-0.5 -mx-1.5 transition-colors hover:bg-white/[0.06] hover:text-fg-2",
        voted && "text-accent hover:text-accent",
      )}
    >
      {content}
    </button>
  );
}

/** 一列文字動作鈕，讓 meta 那排的編輯／刪除跟投票長得一致 */
function MetaButton({
  onClick,
  disabled,
  danger,
  children,
}: {
  onClick: () => void;
  disabled?: boolean;
  danger?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "flex items-center gap-1 rounded px-1.5 py-0.5 -mx-1.5 transition-colors hover:bg-white/[0.06] disabled:opacity-50",
        danger ? "text-red hover:text-red" : "hover:text-fg-2",
      )}
    >
      {children}
    </button>
  );
}

/** 兩段式刪除：先按一次才會出現「確定刪除」，免得誤觸 */
function DeleteButton({ armed, onArm, onConfirm, busy }: { armed: boolean; onArm: () => void; onConfirm: () => void; busy: boolean }) {
  if (!armed) {
    return (
      <MetaButton onClick={onArm} disabled={busy}>
        <Trash2 size={10} />
        刪除
      </MetaButton>
    );
  }
  return (
    <MetaButton onClick={onConfirm} disabled={busy} danger>
      <Trash2 size={10} />
      確定刪除？
    </MetaButton>
  );
}

function EditBox({
  title,
  body,
  onSave,
  onCancel,
  busy,
}: {
  title?: string;
  body: string;
  onSave: (next: { title?: string; body: string }) => void;
  onCancel: () => void;
  busy: boolean;
}) {
  const [t, setT] = useState(title ?? "");
  const [b, setB] = useState(body);
  const invalid = title !== undefined ? !t.trim() : !b.trim();

  return (
    <div className="mt-1 rounded-lg border border-line bg-bg-3/40 p-2.5">
      {title !== undefined ? (
        <input
          value={t}
          onChange={(e) => setT(e.target.value)}
          className="w-full bg-transparent text-[13.5px] font-semibold text-fg outline-none"
          placeholder="標題"
        />
      ) : null}
      <textarea
        value={b}
        onChange={(e) => setB(e.target.value)}
        rows={3}
        className={cn(
          "w-full resize-none bg-transparent text-[13px] leading-relaxed text-fg-2 outline-none placeholder:text-fg-3",
          title !== undefined && "mt-1.5",
        )}
        placeholder="內容"
      />
      <div className="mt-1.5 flex items-center justify-end gap-2 border-t border-line pt-2">
        <Button type="button" variant="ghost" size="sm" onClick={onCancel} disabled={busy}>
          取消
        </Button>
        <Button type="button" size="sm" disabled={invalid || busy} onClick={() => onSave({ title: title !== undefined ? t.trim() : undefined, body: b.trim() })}>
          {busy ? <Loader2 size={13} className="animate-spin" /> : null}
          儲存
        </Button>
      </div>
    </div>
  );
}

function Thread({
  q,
  now,
  role,
  authenticated,
  questionsOpen,
  onChanged,
}: {
  q: Question;
  now?: number;
  role: string;
  authenticated: boolean;
  questionsOpen: boolean;
  onChanged: () => void;
}) {
  const [open, setOpen] = useState(q.answers.length > 0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [editingAnswer, setEditingAnswer] = useState<string | null>(null);
  /** 目前按了一次刪除、等第二次確認的對象："q" 或回覆 id */
  const [armed, setArmed] = useState<string | null>(null);
  const [reply, setReply] = useState("");

  const editLocal = useProgress((s) => s.editQuestion);
  const removeLocal = useProgress((s) => s.removeQuestion);

  const local = q.id.startsWith("local-");

  const act = async (fn: () => Promise<unknown> | unknown, done?: () => void) => {
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      await fn();
      done?.();
      setArmed(null);
      onChanged();
    } catch (e) {
      setError(e instanceof Error ? e.message : "操作失敗");
    } finally {
      setBusy(false);
    }
  };

  const vote = (on: boolean, answerId?: string) =>
    act(() => api("/api/questions/" + q.id + "/vote", { body: { on, answerId } }));

  const accept = (answerId: string | null) =>
    act(() => api("/api/questions/" + q.id, { method: "PATCH", body: { acceptedAnswerId: answerId } }));

  const votable = authenticated && !local;
  // 回覆權限跟後台問答頁同一張表：助教以上不受「暫停發問」影響，也不會被限流
  const staff = can(role, "questions.answer");
  const mayModerate = can(role, "questions.delete");
  const mayReply = authenticated && !local && (questionsOpen || staff);
  const mayAccept = (q.mine || staff) && !local;
  // 已經有別人回覆就不讓作者整串刪掉，會把別人寫的東西一起帶走
  const mayDeleteThread = mayModerate || (Boolean(q.mine) && q.answers.every((a) => a.mine));

  const submitReply = () => {
    const body = reply.trim();
    if (!body) return;
    act(() => api("/api/questions/" + q.id + "/answers", { body: { body } }), () => setReply(""));
  };

  const saveQuestion = (next: { title?: string; body: string }) =>
    act(
      () =>
        local
          ? editLocal(q.id, { title: next.title ?? q.title, body: next.body })
          : api("/api/questions/" + q.id, { method: "PATCH", body: { title: next.title, body: next.body } }),
      () => setEditing(false),
    );

  const deleteThread = () =>
    act(() => (local ? removeLocal(q.id) : api("/api/questions/" + q.id, { method: "DELETE" })));

  const saveAnswer = (a: Answer, body: string) =>
    act(() => api("/api/questions/" + q.id + "/answers/" + a.id, { method: "PATCH", body: { body } }), () => setEditingAnswer(null));

  const deleteAnswer = (a: Answer) =>
    act(() => api("/api/questions/" + q.id + "/answers/" + a.id, { method: "DELETE" }));

  return (
    <div className="border-b border-line py-4 last:border-b-0">
      <div className="flex gap-3">
        <HexAvatar seed={q.author} size={30} />
        <div className="min-w-0 flex-1">
          {editing ? (
            <EditBox title={q.title} body={q.body} busy={busy} onCancel={() => setEditing(false)} onSave={saveQuestion} />
          ) : (
            <>
              <h4 className="text-[14px] font-bold leading-snug text-fg">{q.title}</h4>
              {q.body ? <p className="mt-1.5 text-[13px] leading-relaxed text-fg-2">{q.body}</p> : null}
            </>
          )}
          <div className="mt-2 flex flex-wrap items-center gap-3 font-mono text-[11px] text-fg-3">
            <span className="text-fg-2">{q.author}</span>
            <span>{relativeTime(q.createdAt, now)}</span>
            {q.editedAt ? <span title={"編輯於 " + relativeTime(q.editedAt, now)}>已編輯</span> : null}
            <VoteButton votes={q.votes} voted={q.voted} disabled={!votable} onVote={() => vote(!q.voted)} />
            {q.answers.length > 0 ? (
              <button
                onClick={() => setOpen((v) => !v)}
                className="flex items-center gap-1 text-accent hover:underline"
              >
                <MessageSquare size={11} />
                {q.answers.length} 則回覆
              </button>
            ) : (
              <span className="text-amber">等待回覆</span>
            )}
            {mayReply && !open ? (
              <MetaButton onClick={() => setOpen(true)}>
                <Reply size={10} />
                回覆
              </MetaButton>
            ) : null}
            {q.mine && !editing ? (
              <MetaButton onClick={() => setEditing(true)} disabled={busy}>
                <Pencil size={10} />
                編輯
              </MetaButton>
            ) : null}
            {mayDeleteThread ? (
              <DeleteButton armed={armed === "q"} busy={busy} onArm={() => setArmed("q")} onConfirm={deleteThread} />
            ) : null}
          </div>
        </div>
      </div>

      {open ? (
        <div className="ml-4 mt-3 flex flex-col gap-3 border-l border-line pl-5">
          {q.answers.map((a) => (
            <div key={a.id} className="flex gap-2.5">
              <HexAvatar seed={a.author} size={26} />
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-mono text-[12.5px] font-bold text-fg">
                    {a.author}
                  </span>
                  <span
                    className={cn(
                      "rounded border px-1.5 py-px font-mono text-[9.5px] tracking-wider",
                      ROLE_STYLE[a.role],
                    )}
                  >
                    {a.role}
                  </span>
                  {a.accepted ? (
                    <span className="flex items-center gap-1 font-mono text-[10px] text-accent">
                      <Check size={10} strokeWidth={3} />
                      最佳解答
                    </span>
                  ) : null}
                  <span className="font-mono text-[10.5px] text-fg-3">
                    {relativeTime(a.createdAt, now)}
                  </span>
                  {a.editedAt ? <span className="font-mono text-[10.5px] text-fg-3">已編輯</span> : null}
                </div>
                {editingAnswer === a.id ? (
                  <EditBox body={a.body} busy={busy} onCancel={() => setEditingAnswer(null)} onSave={(n) => saveAnswer(a, n.body)} />
                ) : (
                  <p className="mt-1 text-[13px] leading-relaxed text-fg-2">{a.body}</p>
                )}
                <div className="mt-1.5 flex flex-wrap items-center gap-3 font-mono text-[10.5px] text-fg-3">
                  <VoteButton
                    votes={a.votes}
                    voted={a.voted}
                    disabled={!votable}
                    onVote={() => vote(!a.voted, a.id)}
                    size="sm"
                  />
                  {mayAccept ? (
                    <MetaButton onClick={() => accept(a.accepted ? null : a.id)} disabled={busy}>
                      <Check size={10} />
                      {a.accepted ? "取消最佳解答" : "這個解決了我的問題"}
                    </MetaButton>
                  ) : null}
                  {a.mine && editingAnswer !== a.id ? (
                    <MetaButton onClick={() => setEditingAnswer(a.id)} disabled={busy}>
                      <Pencil size={10} />
                      編輯
                    </MetaButton>
                  ) : null}
                  {a.mine || mayModerate ? (
                    <DeleteButton armed={armed === a.id} busy={busy} onArm={() => setArmed(a.id)} onConfirm={() => deleteAnswer(a)} />
                  ) : null}
                </div>
              </div>
            </div>
          ))}

          {mayReply ? (
            <div className="mt-1">
              <textarea
                value={reply}
                onChange={(e) => setReply(e.target.value)}
                rows={2}
                placeholder={q.mine ? "補充你後來又試了什麼，或追問沒講清楚的地方" : "回覆這個問題"}
                className="w-full resize-none rounded-lg border border-line bg-bg-3/40 px-3 py-2 text-[13px] leading-relaxed text-fg-2 outline-none placeholder:text-fg-3 focus:border-accent/40"
              />
              <div className="mt-1.5 flex items-center justify-between gap-3">
                <span className="font-mono text-[10.5px] text-fg-3">
                  {q.answers.some((a) => a.accepted) ? "已經有最佳解答，還是可以繼續補充或追問" : "\u00a0"}
                </span>
                <Button type="button" size="sm" disabled={!reply.trim() || busy} onClick={submitReply}>
                  {busy ? <Loader2 size={13} className="animate-spin" /> : <Send size={13} />}
                  送出回覆
                </Button>
              </div>
            </div>
          ) : authenticated || local ? null : (
            <p className="font-mono text-[10.5px] text-fg-3">登入後才能回覆這個討論</p>
          )}
        </div>
      ) : null}

      {error ? <p className="mt-2 text-[12px] text-red">{error}</p> : null}
    </div>
  );
}

/**
 * Threads for a lesson or a challenge, read from GET /api/questions. Signed-in
 * learners post through the API (and on to Discord); guests keep their
 * questions in this browser only. Turning off settings.features.questions
 * leaves the threads readable but takes the composer away — 助教以上不受影響，
 * 因為他們本來就要在前台回覆。
 */
export function QaPanel({
  scope,
  refId,
  compact,
}: {
  scope: "lesson" | "challenge";
  refId: string;
  compact?: boolean;
}) {
  const asked = useProgress((s) => s.askedQuestions);
  const ask = useProgress((s) => s.askQuestion);
  const handle = useProgress((s) => s.handle);
  const role = useProgress((s) => s.role);
  const authenticated = useProgress((s) => s.authenticated);
  const hydrated = useHydrated();
  const questionsOpen = useFeatures().questions;

  const [remote, setRemote] = useState<Question[] | null>(null);
  const [tick, setTick] = useState(0);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    api<Question[]>("/api/questions?scope=" + scope + "&ref=" + encodeURIComponent(refId))
      .then((q) => alive && setRemote(q))
      .catch(() => alive && setRemote([]));
    return () => {
      alive = false;
    };
  }, [scope, refId, tick]);

  const mine: Question[] = hydrated && !authenticated
    ? asked
        .filter((q) => q.scope === scope && q.refId === refId)
        .map((q) => ({
          id: q.id,
          scope: q.scope,
          refId: q.refId,
          title: q.title,
          body: q.body,
          author: handle,
          createdAt: q.createdAt,
          votes: 0,
          answers: [],
          mine: true,
        }))
    : [];

  const all = [...mine, ...(remote ?? [])];
  const now = useNow(60_000);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || busy) return;
    setError(null);
    if (authenticated) {
      setBusy(true);
      try {
        await api("/api/questions", { body: { scope, refId, title: title.trim(), body: body.trim() } });
        setTick((t) => t + 1);
      } catch (err) {
        setError(err instanceof Error ? err.message : "送出失敗");
        setBusy(false);
        return;
      }
      setBusy(false);
    } else {
      ask({ scope, refId, title: title.trim(), body: body.trim() });
    }
    setTitle("");
    setBody("");
    setSent(true);
    setTimeout(() => setSent(false), 3200);
  };

  return (
    <div className={compact ? "" : "card p-5"}>
      {questionsOpen ? (
        <form onSubmit={submit} className="rounded-xl border border-line bg-bg-3/40 p-3.5">
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="卡在哪裡？一句話說明你的問題"
            className="w-full bg-transparent text-[13.5px] font-semibold text-fg outline-none placeholder:text-fg-3"
          />
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="補充你試過什麼、看到什麼錯誤訊息。講得越具體，助教回得越快。"
            rows={2}
            className="mt-2 w-full resize-none bg-transparent text-[13px] leading-relaxed text-fg-2 outline-none placeholder:text-fg-3"
          />
          <div className="mt-2 flex items-center justify-between border-t border-line pt-2.5">
            <span className="font-mono text-[11px] text-fg-3">
              {sent ? (
                <span className="text-accent">{authenticated ? "已送出，同步到 Discord 頻道" : "已記在這台瀏覽器"}</span>
              ) : authenticated ? (
                "問題會同步到 Discord，助教與講師都看得到"
              ) : (
                "未登入的問題只存在這台瀏覽器，登入後才會送到助教那邊"
              )}
            </span>
            <Button type="submit" size="sm" disabled={!title.trim() || busy}>
              {busy ? <Loader2 size={13} className="animate-spin" /> : <Send size={13} />}
              發問
            </Button>
          </div>
          {error ? <p className="mt-2 text-[12px] text-red">{error}</p> : null}
        </form>
      ) : (
        <div className="flex items-center gap-2.5 rounded-xl border border-line bg-bg-3/40 px-3.5 py-3">
          <Lock size={14} className="shrink-0 text-fg-3" />
          <p className="text-[12.5px] leading-relaxed text-fg-3">
            目前沒有開放發問，下面的討論還是可以看。急的話直接到 Discord 找助教。
          </p>
        </div>
      )}

      <div className="mt-4 flex items-center gap-2">
        <MessageSquare size={14} className="text-fg-3" />
        <span className="text-[13px] font-semibold text-fg-2">
          {remote === null ? "載入中" : all.length + " 個討論"}
        </span>
        <span className="ml-auto flex items-center gap-1 font-mono text-[10.5px] text-fg-3">
          <ShieldCheck size={11} className="text-blue" />
          助教平均 10 分鐘內回覆
        </span>
      </div>

      <div className="mt-1">
        {remote !== null && all.length === 0 ? (
          <p className="py-8 text-center text-[13px] text-fg-3">
            還沒有人問過這裡。第一個發問的就是你。
          </p>
        ) : (
          all.map((q) => (
            <Thread
              key={q.id}
              q={q}
              now={now || undefined}
              role={hydrated ? role : "student"}
              authenticated={hydrated && authenticated}
              questionsOpen={questionsOpen}
              onChanged={() => setTick((t) => t + 1)}
            />
          ))
        )}
      </div>
    </div>
  );
}
