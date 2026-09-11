"use client";

import { useState } from "react";
import { Server, Play, Square, Copy, Check, Download, Loader2, Timer } from "lucide-react";
import { Button } from "@/components/ui/primitives";
import { api } from "@/lib/api";
import type { Challenge } from "@/data/challenges";
import { useProgress, useHydrated } from "@/store/progress";
import { useFeatures } from "@/components/settings-provider";
import { useNow } from "@/lib/use-now";
import { formatDuration } from "@/lib/utils";

const CONNECTION_LABEL = {
  http: "在瀏覽器開啟",
  nc: "用 netcat 連線",
  ssh: "用 SSH 連線",
} as const;

interface SpawnResponse {
  id?: string;
  host: string | null;
  port: number | null;
  expiresAt: string | null;
  type: string;
  shared: boolean;
}

/** Per-learner challenge environment. Starting and stopping always go through the server. */
export function InstancePanel({ challenge }: { challenge: Challenge }) {
  const info = useProgress((s) => s.instances[challenge.slug]);
  const spawn = useProgress((s) => s.spawnInstance);
  const kill = useProgress((s) => s.killInstance);
  const authenticated = useProgress((s) => s.authenticated);
  const hydrated = useHydrated();
  const instancesOn = useFeatures().instances;

  const [booting, setBooting] = useState(false);
  const [stopping, setStopping] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const now = useNow(1000);
  const elapsed = info && now ? Math.max(0, (now - info.startedAt) / 1000) : 0;
  const remaining = info?.expiresAt && now ? Math.max(0, (new Date(info.expiresAt).getTime() - now) / 1000) : null;

  if (!challenge.connection && !challenge.files?.length) return null;

  const running = hydrated && instancesOn && Boolean(info);
  // the server hands out the real address once an instance exists; the
  // challenge's fixed connection string is the shared fallback
  const address = running && info?.host ? info.host + (info.port ? ":" + info.port : "") : (challenge.connection?.value ?? "");

  const start = async () => {
    setError(null);
    setBooting(true);
    try {
      const res = await api<SpawnResponse>("/api/challenges/" + challenge.slug + "/instance", { method: "POST" });
      spawn(challenge.slug, { host: res.host, port: res.port, expiresAt: res.expiresAt });
    } catch (e) {
      setError(e instanceof Error ? e.message : "啟動失敗");
    } finally {
      setBooting(false);
    }
  };

  const stop = async () => {
    setError(null);
    setStopping(true);
    try {
      await api("/api/challenges/" + challenge.slug + "/instance", { method: "DELETE" });
      kill(challenge.slug);
    } catch (e) {
      setError(e instanceof Error ? e.message : "終止失敗");
    } finally {
      setStopping(false);
    }
  };

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(address);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      /* clipboard blocked; the value is visible on screen anyway */
    }
  };

  return (
    <div className="card p-5">
      <div className="flex items-center gap-2">
        <Server size={15} className="text-fg-3" />
        <span className="text-[13.5px] font-bold">題目環境</span>
        {running ? (
          <span className="ml-auto flex items-center gap-1.5 font-mono text-[11px] text-accent">
            <span className="h-1.5 w-1.5 animate-pulse-soft rounded-full bg-accent" />
            RUNNING {formatDuration(elapsed)}
          </span>
        ) : null}
      </div>

      {challenge.connection ? (
        running ? (
          <div className="mt-3.5">
            <div className="mono-label mb-1.5">
              {CONNECTION_LABEL[challenge.connection.type]}
            </div>
            <div className="flex items-center gap-2 rounded-lg border border-line bg-bg-0 px-3 py-2.5">
              <code className="min-w-0 flex-1 truncate font-mono text-[12.5px] text-accent">
                {address}
              </code>
              <button
                onClick={copy}
                className="shrink-0 text-fg-3 transition-colors hover:text-fg"
                aria-label="複製連線資訊"
              >
                {copied ? (
                  <Check size={14} className="text-accent" />
                ) : (
                  <Copy size={14} />
                )}
              </button>
            </div>
            {remaining !== null ? (
              <p className="mt-2 flex items-center gap-1.5 font-mono text-[11px] text-fg-3">
                <Timer size={11} />
                {remaining > 0 ? "還有 " + formatDuration(remaining) + " 自動回收" : "已到期，重新啟動可以拿到新的一份"}
              </p>
            ) : null}
            <Button
              variant="danger"
              size="sm"
              className="mt-3 w-full"
              onClick={stop}
              disabled={stopping}
            >
              {stopping ? <Loader2 size={12} className="animate-spin" /> : <Square size={12} />}
              終止環境
            </Button>
            <p className="mt-2 text-[11.5px] leading-relaxed text-fg-3">
              這是你專屬的環境，兩小時後自動回收。壞了就終止再重開。
            </p>
          </div>
        ) : instancesOn ? (
          <div className="mt-3.5">
            <p className="text-[12.5px] leading-relaxed text-fg-2">
              每位學員拿到自己的獨立環境，想怎麼打就怎麼打，壞了重開就好。
            </p>
            <Button className="mt-3 w-full" onClick={start} disabled={booting || !authenticated}>
              {booting ? (
                <>
                  <Loader2 size={14} className="animate-spin" />
                  啟動中
                </>
              ) : (
                <>
                  <Play size={13} />
                  啟動環境
                </>
              )}
            </Button>
          </div>
        ) : (
          /* settings.features.instances off: hand out the shared address only */
          <div className="mt-3.5">
            <div className="mono-label mb-1.5">{CONNECTION_LABEL[challenge.connection.type]}</div>
            <div className="flex items-center gap-2 rounded-lg border border-line bg-bg-0 px-3 py-2.5">
              <code className="min-w-0 flex-1 truncate font-mono text-[12.5px] text-accent">
                {challenge.connection.value}
              </code>
              <button onClick={copy} className="shrink-0 text-fg-3 transition-colors hover:text-fg" aria-label="複製連線資訊">
                {copied ? <Check size={14} className="text-accent" /> : <Copy size={14} />}
              </button>
            </div>
            <p className="mt-2 text-[11.5px] leading-relaxed text-fg-3">
              目前沒有開放個人靶機，大家共用上面這個環境。請不要破壞它，其他人也在用。
            </p>
          </div>
        )
      ) : null}
      {error ? <p className="mt-2 text-[12px] text-red">{error}</p> : null}

      {challenge.files?.length ? (
        <div className="mt-4 border-t border-line pt-4">
          <div className="mono-label mb-2">附件</div>
          <div className="flex flex-col gap-1.5">
            {challenge.files.map((f) => {
              const url = challenge.fileUrls?.[f] ?? null;
              const inner = (
                <>
                  <Download size={13} className="shrink-0 text-fg-3" />
                  <span className="min-w-0 flex-1 truncate font-mono text-[12px] text-fg-2">{f}</span>
                  {!url ? <span className="shrink-0 font-mono text-[10px] text-fg-3">尚未上傳</span> : null}
                </>
              );
              return url ? (
                <a key={f} href={url} download className="flex items-center gap-2 rounded-lg border border-line bg-bg-3/40 px-3 py-2 transition-colors hover:border-accent/40">
                  {inner}
                </a>
              ) : (
                <div key={f} className="flex items-center gap-2 rounded-lg border border-line bg-bg-3/40 px-3 py-2">
                  {inner}
                </div>
              );
            })}
          </div>
        </div>
      ) : null}
    </div>
  );
}
