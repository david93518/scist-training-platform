"use client";

import { useEffect, useState } from "react";
import { MessageSquare, ThumbsUp, Check, Send, ShieldCheck, Loader2, Lock } from "lucide-react";
import { HexAvatar, Button } from "@/components/ui/primitives";
import type { Question } from "@/data/questions";
import { api } from "@/lib/api";
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

function Thread({
  q,
  now,
  canVote,
  onChanged,
}: {
  q: Question;
  now?: number;
  canVote: boolean;
  onChanged: () => void;
}) {
  const [open, setOpen] = useState(q.answers.length > 0);
  const [busy, setBusy] = useState(false);
  const local = q.id.startsWith("local-");

  const act = async (fn: () => Promise<unknown>) => {
    if (busy) return;
    setBusy(true);
    try {
      await fn();
      onChanged();
    } catch {
      /* the list refreshes on the next poll; a failed vote is not worth a toast */
    } finally {
      setBusy(false);
    }
  };

  const vote = (on: boolean, answerId?: string) =>
    act(() => api("/api/questions/" + q.id + "/vote", { body: { on, answerId } }));

  const accept = (answerId: string) =>
    act(() => api("/api/questions/" + q.id, { method: "PATCH", body: { acceptedAnswerId: answerId } }));

  const votable = canVote && !local;

  return (
    <div className="border-b border-line py-4 last:border-b-0">
      <div className="flex gap-3">
        <HexAvatar seed={q.author} size={30} />
        <div className="min-w-0 flex-1">
          <h4 className="text-[14px] font-bold leading-snug text-fg">{q.title}</h4>
          <p className="mt-1.5 text-[13px] leading-relaxed text-fg-2">{q.body}</p>
          <div className="mt-2 flex flex-wrap items-center gap-3 font-mono text-[11px] text-fg-3">
            <span className="text-fg-2">{q.author}</span>
            <span>{relativeTime(q.createdAt, now)}</span>
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
          </div>
        </div>
      </div>

      {open && q.answers.length > 0 ? (
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
                </div>
                <p className="mt-1 text-[13px] leading-relaxed text-fg-2">{a.body}</p>
                <div className="mt-1.5 flex flex-wrap items-center gap-3 font-mono text-[10.5px] text-fg-3">
                  <VoteButton
                    votes={a.votes}
                    voted={a.voted}
                    disabled={!votable}
                    onVote={() => vote(!a.voted, a.id)}
                    size="sm"
                  />
                  {q.mine && !a.accepted ? (
                    <button
                      type="button"
                      onClick={() => accept(a.id)}
                      disabled={busy}
                      className="rounded px-1.5 py-0.5 -mx-1.5 text-accent transition-colors hover:bg-accent/10 disabled:opacity-50"
                    >
                      這個解決了我的問題
                    </button>
                  ) : null}
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}

/**
 * Threads for a lesson or a challenge, read from GET /api/questions. Signed-in
 * learners post through the API (and on to Discord); guests keep their
 * questions in this browser only. Turning off settings.features.questions
 * leaves the threads readable but takes the composer away.
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
              canVote={hydrated && authenticated}
              onChanged={() => setTick((t) => t + 1)}
            />
          ))
        )}
      </div>
    </div>
  );
}
