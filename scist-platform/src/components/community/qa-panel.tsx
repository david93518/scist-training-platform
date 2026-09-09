"use client";

import { useEffect, useState } from "react";
import { MessageSquare, ThumbsUp, Check, Send, ShieldCheck, Loader2 } from "lucide-react";
import { HexAvatar, Button } from "@/components/ui/primitives";
import type { Question } from "@/data/questions";
import { api } from "@/lib/api";
import { useProgress, useHydrated } from "@/store/progress";
import { useNow } from "@/lib/use-now";
import { cn, relativeTime } from "@/lib/utils";

const ROLE_STYLE: Record<string, string> = {
  講師: "text-accent border-accent/40 bg-accent/10",
  助教: "text-blue border-blue/40 bg-blue/10",
  學員: "text-fg-3 border-line bg-bg-3",
};

function Thread({ q, now }: { q: Question; now?: number }) {
  const [open, setOpen] = useState(q.answers.length > 0);
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
            <span className="flex items-center gap-1">
              <ThumbsUp size={11} />
              {q.votes}
            </span>
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
                <div className="mt-1.5 flex items-center gap-1 font-mono text-[10.5px] text-fg-3">
                  <ThumbsUp size={10} />
                  {a.votes}
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
 * questions in this browser only.
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
          all.map((q) => <Thread key={q.id} q={q} now={now || undefined} />)
        )}
      </div>
    </div>
  );
}
