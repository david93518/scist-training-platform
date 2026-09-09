"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Check, ExternalLink, MessageSquare, Send, ThumbsUp } from "lucide-react";
import { getAdminApi } from "@/admin/api";
import type { AdminQuestion } from "@/admin/types";
import { Button, HexAvatar } from "@/components/ui/primitives";
import { ConfirmDelete, PageTitle, Textarea, ToastHost, useAsync, useToast } from "@/components/admin/ui";
import { ROLE_LABEL } from "@/components/admin/admin-shell";
import { useProgress } from "@/store/progress";
import { cn, relativeTime } from "@/lib/utils";
import { useNow } from "@/lib/use-now";

function refHref(q: AdminQuestion) {
  return q.scope === "lesson" ? "/learn/" + q.refId : "/challenges/" + q.refId;
}

export function QuestionsAdmin() {
  const api = getAdminApi();
  const toast = useToast((s) => s.push);
  const list = useAsync(() => api.questions.list());
  const now = useNow(60_000);
  const handle = useProgress((s) => s.handle);
  const role = useProgress((s) => s.role);
  const [filter, setFilter] = useState<"open" | "all">("open");
  const [drafts, setDrafts] = useState<Record<string, string>>({});

  const visible = useMemo(() => {
    const l = list.data ?? [];
    return filter === "open" ? l.filter((q) => !q.acceptedAnswerId) : l;
  }, [list.data, filter]);

  const openCount = (list.data ?? []).filter((q) => !q.acceptedAnswerId).length;

  const reply = async (q: AdminQuestion) => {
    const body = (drafts[q.id] ?? "").trim();
    if (!body) return;
    await api.questions.answer(q.id, body, { handle, role: ROLE_LABEL[role] });
    setDrafts({ ...drafts, [q.id]: "" });
    await list.reload();
    toast("已回覆");
  };

  return (
    <div>
      <PageTitle
        kicker="Q&A"
        title="問答"
        desc={<>{openCount} 個問題還沒有被標記為已解決。回覆時記得 SOP：觀念提示 → 方向引導 → 驗證思路，不直接給答案。</>}
        actions={
          <div className="flex rounded-lg border border-white/[0.08] bg-bg-0 p-0.5">
            {(["open", "all"] as const).map((f) => (
              <button key={f} onClick={() => setFilter(f)} className={cn("rounded-md px-3 py-1.5 text-[12.5px] font-bold", filter === f ? "bg-white/[0.1] text-fg" : "text-fg-3")}>
                {f === "open" ? "待處理" : "全部"}
              </button>
            ))}
          </div>
        }
      />

      <div className="flex flex-col gap-4">
        {visible.map((q) => (
          <div key={q.id} className={cn("card p-6", q.acceptedAnswerId && "opacity-80")}>
            <div className="flex items-start gap-3">
              <HexAvatar seed={q.authorHandle} size={34} />
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded border border-white/[0.08] px-1.5 py-px font-mono text-[10px] text-fg-3">{q.scope === "lesson" ? "課程" : "題目"}</span>
                  <Link href={refHref(q)} target="_blank" className="flex items-center gap-1 font-mono text-[11px] text-fg-3 hover:text-accent">
                    {q.refId}
                    <ExternalLink size={10} />
                  </Link>
                  {q.acceptedAnswerId ? (
                    <span className="flex items-center gap-1 font-mono text-[10px] text-accent">
                      <Check size={10} strokeWidth={3} />
                      已解決
                    </span>
                  ) : (
                    <span className="font-mono text-[10px] text-amber">待處理</span>
                  )}
                </div>
                <h3 className="mt-1.5 text-[16px] font-extrabold">{q.title}</h3>
                <p className="mt-1.5 text-[13.5px] leading-relaxed text-fg-2">{q.body}</p>
                <div className="mt-2 flex items-center gap-3 font-mono text-[11px] text-fg-3">
                  <span className="text-fg-2">{q.authorHandle}</span>
                  <span>{relativeTime(q.createdAt, now)}</span>
                  <span className="flex items-center gap-1">
                    <ThumbsUp size={10} />
                    {q.votes}
                  </span>
                </div>
              </div>
              <ConfirmDelete
                onConfirm={async () => {
                  await api.questions.remove(q.id);
                  await list.reload();
                  toast("已刪除");
                }}
              />
            </div>

            {q.answers.length > 0 ? (
              <div className="ml-4 mt-4 flex flex-col gap-3 border-l border-white/[0.08] pl-5">
                {q.answers.map((a) => (
                  <div key={a.id} className="flex gap-2.5">
                    <HexAvatar seed={a.authorHandle} size={26} />
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-mono text-[12.5px] font-bold">{a.authorHandle}</span>
                        <span className="rounded border border-white/[0.08] px-1.5 py-px font-mono text-[9.5px] text-fg-3">{a.authorRole}</span>
                        <span className="font-mono text-[10.5px] text-fg-3">{relativeTime(a.createdAt, now)}</span>
                        {q.acceptedAnswerId === a.id ? (
                          <span className="flex items-center gap-1 font-mono text-[10px] text-accent">
                            <Check size={10} strokeWidth={3} />
                            最佳解答
                          </span>
                        ) : (
                          <button
                            onClick={async () => {
                              await api.questions.accept(q.id, a.id);
                              await list.reload();
                            }}
                            className="font-mono text-[10px] text-fg-3 hover:text-accent"
                          >
                            標為最佳解答
                          </button>
                        )}
                      </div>
                      <p className="mt-1 text-[13px] leading-relaxed text-fg-2">{a.body}</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : null}

            <div className="mt-4 flex gap-2">
              <Textarea
                value={drafts[q.id] ?? ""}
                onChange={(e) => setDrafts({ ...drafts, [q.id]: e.target.value })}
                rows={2}
                placeholder={"以 " + handle + "（" + ROLE_LABEL[role] + "）身分回覆"}
                className="min-h-0"
              />
              <Button size="sm" className="self-end" disabled={!(drafts[q.id] ?? "").trim()} onClick={() => reply(q)}>
                <Send size={13} />
                回覆
              </Button>
            </div>
          </div>
        ))}
        {visible.length === 0 && !list.loading ? (
          <div className="card flex flex-col items-center gap-2 py-14 text-center">
            <MessageSquare size={22} className="text-fg-3" />
            <p className="text-[14px] font-bold">沒有待處理的問題</p>
          </div>
        ) : null}
      </div>
      <ToastHost />
    </div>
  );
}
