"use client";

/**
 * Upload widgets. They never touch storage directly: they ask the AdminApi
 * for a ticket, then either PUT/POST the bytes straight to the provider
 * (mode "direct") or simulate progress (mode "mock"). See docs/INTEGRATIONS.md.
 */
import { useRef, useState } from "react";
import { UploadCloud, FileArchive, Check, Loader2, X, RefreshCw, Video, AlertTriangle } from "lucide-react";
import { getAdminApi } from "@/admin/api";
import type { AdminFile, UploadTicket, VideoProvider, VideoStatus } from "@/admin/types";
import { Button, buttonClass } from "@/components/ui/primitives";
import { Field, Input } from "@/components/admin/ui";
import { cn } from "@/lib/utils";

function humanSize(n: number | null) {
  if (!n) return "";
  if (n < 1024 * 1024) return Math.round(n / 1024) + " KB";
  return (n / 1024 / 1024).toFixed(1) + " MB";
}

/** Direct-to-provider upload with progress; falls back to a simulated one. */
function uploadWithProgress(
  ticket: UploadTicket,
  file: File,
  onProgress: (pct: number) => void,
  method: "PUT" | "POST",
): Promise<void> {
  if (ticket.mode === "mock" || !ticket.uploadUrl) {
    return new Promise((resolve) => {
      let pct = 0;
      const id = setInterval(() => {
        pct = Math.min(100, pct + 6 + Math.random() * 10);
        onProgress(pct);
        if (pct >= 100) {
          clearInterval(id);
          resolve();
        }
      }, 120);
    });
  }
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open(method, ticket.uploadUrl!);
    xhr.upload.onprogress = (e) => e.lengthComputable && onProgress((e.loaded / e.total) * 100);
    xhr.onload = () => (xhr.status >= 200 && xhr.status < 300 ? resolve() : reject(new Error("上傳失敗 " + xhr.status)));
    xhr.onerror = () => reject(new Error("上傳時網路錯誤"));
    if (method === "POST") {
      const fd = new FormData();
      fd.append("file", file);
      xhr.send(fd);
    } else {
      xhr.setRequestHeader("content-type", file.type || "application/octet-stream");
      xhr.send(file);
    }
  });
}

function Dropzone({
  accept,
  hint,
  onFile,
  disabled,
}: {
  accept: string;
  hint: string;
  onFile: (f: File) => void;
  disabled?: boolean;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [over, setOver] = useState(false);
  return (
    <div
      onDragOver={(e) => {
        e.preventDefault();
        setOver(true);
      }}
      onDragLeave={() => setOver(false)}
      onDrop={(e) => {
        e.preventDefault();
        setOver(false);
        const f = e.dataTransfer.files?.[0];
        if (f && !disabled) onFile(f);
      }}
      onClick={() => !disabled && inputRef.current?.click()}
      className={cn(
        "flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed px-6 py-10 text-center transition-colors",
        over ? "border-accent bg-accent/[0.06]" : "border-white/[0.12] bg-white/[0.02] hover:border-white/25",
        disabled && "pointer-events-none opacity-50",
      )}
    >
      <span className="grid h-12 w-12 place-items-center rounded-2xl bg-accent/15">
        <UploadCloud size={22} className="text-accent" />
      </span>
      <div className="text-[14px] font-bold">拖進來，或點一下選檔案</div>
      <div className="text-[12px] text-fg-3">{hint}</div>
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) onFile(f);
          e.currentTarget.value = "";
        }}
      />
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* video                                                                */
/* ------------------------------------------------------------------ */
export function parseYouTubeId(input: string) {
  const s = input.trim();
  const m =
    s.match(/(?:v=|youtu\.be\/|embed\/|shorts\/)([A-Za-z0-9_-]{11})/) ?? s.match(/^([A-Za-z0-9_-]{11})$/);
  return m ? m[1] : "";
}

export function VideoField({
  lessonId,
  provider,
  videoId,
  status,
  onChange,
}: {
  lessonId: string;
  provider: VideoProvider;
  videoId: string | null;
  status: VideoStatus;
  onChange: (v: { videoProvider: VideoProvider; videoId: string | null; videoStatus: VideoStatus }) => void;
}) {
  const api = getAdminApi();
  const [pct, setPct] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ytInput, setYtInput] = useState(provider === "youtube" ? (videoId ?? "") : "");
  // the last upload only pretended, because no video host is configured
  const [wasSimulated, setWasSimulated] = useState(false);

  const tabs: { id: VideoProvider; label: string; hint: string }[] = [
    { id: "none", label: "無影片", hint: "純講義課程" },
    { id: "youtube", label: "YouTube", hint: "貼未公開影片連結" },
    { id: "stream", label: "Cloudflare Stream", hint: "直接上傳影片檔" },
  ];

  const startUpload = async (file: File) => {
    setError(null);
    setBusy(true);
    setPct(0);
    try {
      const ticket = await api.uploads.video(lessonId, { name: file.name, size: file.size, type: file.type });
      setWasSimulated(ticket.mode === "mock" || !ticket.uploadUrl);
      onChange({ videoProvider: "stream", videoId: ticket.id, videoStatus: "uploading" });
      await uploadWithProgress(ticket, file, setPct, "POST");
      onChange({ videoProvider: "stream", videoId: ticket.id, videoStatus: "processing" });
      const s = await api.uploads.videoStatus(ticket.id);
      onChange({ videoProvider: "stream", videoId: ticket.id, videoStatus: s });
    } catch (e) {
      setError(e instanceof Error ? e.message : "上傳失敗");
      onChange({ videoProvider: "stream", videoId, videoStatus: "error" });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="grid gap-2 sm:grid-cols-3">
        {tabs.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => onChange({ videoProvider: t.id, videoId: t.id === provider ? videoId : null, videoStatus: t.id === provider ? status : "none" })}
            className={cn(
              "rounded-xl border px-4 py-3 text-left transition-colors",
              provider === t.id ? "border-accent/60 bg-accent/10" : "border-white/[0.08] bg-white/[0.02] hover:border-white/20",
            )}
          >
            <div className="text-[13.5px] font-bold">{t.label}</div>
            <div className="text-[11.5px] text-fg-3">{t.hint}</div>
          </button>
        ))}
      </div>

      {provider === "youtube" ? (
        <div className="grid gap-4 sm:grid-cols-[1fr_200px]">
          <Field label="YouTube 連結或 ID" hint="建議設成「不公開」，影片仍可在平台播放但不會被搜尋到。">
            <div className="flex gap-2">
              <Input
                value={ytInput}
                onChange={(e) => {
                  setYtInput(e.target.value);
                  const id = parseYouTubeId(e.target.value);
                  onChange({ videoProvider: "youtube", videoId: id || null, videoStatus: id ? "ready" : "none" });
                }}
                placeholder="https://youtu.be/…"
                className="font-mono"
              />
            </div>
          </Field>
          <div className="overflow-hidden rounded-xl border border-white/[0.08] bg-bg-0">
            {videoId ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={"https://i.ytimg.com/vi/" + videoId + "/hqdefault.jpg"} alt="" className="aspect-video w-full object-cover" />
            ) : (
              <div className="grid aspect-video place-items-center text-fg-3">
                <Video size={22} />
              </div>
            )}
          </div>
        </div>
      ) : null}

      {provider === "stream" ? (
        <div className="flex flex-col gap-3">
          {videoId && !busy ? (
            <div className="flex items-center gap-3 rounded-xl border border-white/[0.08] bg-white/[0.02] px-4 py-3">
              <span className={cn("grid h-9 w-9 place-items-center rounded-lg", status === "ready" ? "bg-accent/15 text-accent" : status === "error" ? "bg-red/15 text-red" : "bg-amber/15 text-amber")}>
                {status === "ready" ? <Check size={16} strokeWidth={3} /> : status === "error" ? <X size={16} /> : <Loader2 size={16} className="animate-spin" />}
              </span>
              <div className="min-w-0 flex-1">
                <div className="truncate font-mono text-[12.5px]">{videoId}</div>
                <div className="text-[11.5px] text-fg-3">
                  {status === "ready" ? "已可播放" : status === "processing" ? "Cloudflare 轉檔中，通常一兩分鐘" : status === "error" ? "上傳失敗，重新上傳一次" : status}
                </div>
              </div>
              {status === "processing" ? (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={async () => onChange({ videoProvider: "stream", videoId, videoStatus: await api.uploads.videoStatus(videoId) })}
                >
                  <RefreshCw size={13} />
                  重新檢查
                </Button>
              ) : null}
              <Button type="button" variant="ghost" size="sm" onClick={() => onChange({ videoProvider: "stream", videoId: null, videoStatus: "none" })}>
                移除
              </Button>
            </div>
          ) : null}

          {busy ? (
            <div className="rounded-xl border border-white/[0.08] bg-white/[0.02] px-4 py-4">
              <div className="mb-2 flex items-center justify-between text-[12.5px]">
                <span className="flex items-center gap-2">
                  <Loader2 size={14} className="animate-spin text-accent" />
                  {pct < 100 ? "上傳中" : "等待轉檔"}
                </span>
                <span className="font-mono text-fg-3">{Math.round(pct)}%</span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-white/[0.08]">
                <div className="h-full rounded-full bg-accent transition-[width]" style={{ width: pct + "%" }} />
              </div>
            </div>
          ) : (
            <Dropzone accept="video/*" hint="MP4 或 MOV，建議 1080p。瀏覽器直接傳到 Cloudflare，不經過我們的伺服器。" onFile={startUpload} disabled={busy} />
          )}
          {error ? <p className="text-[12.5px] text-red">{error}</p> : null}
          {/* 沒接 Cloudflare 時上傳是假的。不講清楚的話，講師會以為影片已經上好了 */}
          {wasSimulated && !busy ? (
            <div className="flex items-start gap-2.5 rounded-xl border border-amber/40 bg-amber/[0.07] px-4 py-3">
              <AlertTriangle size={15} className="mt-0.5 shrink-0 text-amber" />
              <p className="text-[12.5px] leading-relaxed text-fg-2">
                <span className="font-bold text-amber">這次上傳是模擬的，檔案沒有真的傳出去。</span>
                目前還沒有設定 Cloudflare Stream（<span className="font-mono">CF_STREAM_API_TOKEN</span>），
                系統只產生了一個假的影片 ID，學員看到的會是替身播放器。
                要真的上架影片，請先接好 Stream，或改用上面的 YouTube 方式貼未公開連結。
              </p>
            </div>
          ) : null}
          <p className="font-mono text-[11px] leading-relaxed text-fg-3">
            {api.mode === "local"
              ? "本機模式：上傳是模擬的，會產生一個假的影片 ID。接上 CF_STREAM_API_TOKEN 後就是真的。"
              : "流程：後端向 Cloudflare 要一次性的上傳網址 → 瀏覽器把檔案 POST 過去 → 後端輪詢轉檔狀態。"}
          </p>
        </div>
      ) : null}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* attachments                                                          */
/* ------------------------------------------------------------------ */
export function FilesField({
  challengeId,
  files,
  onChange,
}: {
  challengeId: string;
  files: AdminFile[];
  onChange: (files: AdminFile[]) => void;
}) {
  const api = getAdminApi();
  const [progress, setProgress] = useState<Record<string, number>>({});
  /** 檔案 id → 這次其實沒送出去（沒接 R2） */
  const [simulated, setSimulated] = useState<Record<string, boolean>>({});

  const add = async (file: File) => {
    const temp: AdminFile = { id: "tmp-" + Date.now(), name: file.name, size: file.size, objectKey: null, status: "uploading" };
    const next = [...files, temp];
    onChange(next);
    try {
      const ticket = await api.uploads.file(challengeId, { name: file.name, size: file.size, type: file.type });
      const fake = ticket.mode === "mock" || !ticket.uploadUrl;
      await uploadWithProgress(ticket, file, (p) => setProgress((s) => ({ ...s, [temp.id]: p })), "PUT");
      setSimulated((s) => ({ ...s, [ticket.id]: fake }));
      onChange(next.map((f) => (f.id === temp.id ? { ...f, id: ticket.id, objectKey: ticket.objectKey ?? null, status: "ready" } : f)));
    } catch {
      onChange(next.filter((f) => f.id !== temp.id));
    }
  };

  const anySimulated = Object.values(simulated).some(Boolean);

  return (
    <div className="flex flex-col gap-3">
      {files.length > 0 ? (
        <div className="flex flex-col gap-2">
          {files.map((f) => (
            <div key={f.id} className="flex items-center gap-3 rounded-lg border border-white/[0.08] bg-white/[0.02] px-3 py-2.5">
              <FileArchive size={15} className="shrink-0 text-fg-3" />
              <div className="min-w-0 flex-1">
                <div className="truncate font-mono text-[12.5px]">{f.name}</div>
                <div className="text-[11px] text-fg-3">
                  {f.status === "uploading"
                    ? "上傳中 " + Math.round(progress[f.id] ?? 0) + "%"
                    : f.status === "ready"
                      ? simulated[f.id]
                        ? "模擬上傳，檔案沒有真的送出 · " + humanSize(f.size)
                        : "已上傳 · " + humanSize(f.size) + (f.objectKey ? " · " + f.objectKey : "")
                      : "僅列出檔名，尚未上傳"}
                </div>
              </div>
              {f.status === "uploading" ? (
                <Loader2 size={14} className="animate-spin text-accent" />
              ) : (
                <button type="button" onClick={() => onChange(files.filter((x) => x.id !== f.id))} className="text-fg-3 hover:text-red" aria-label="移除">
                  <X size={14} />
                </button>
              )}
            </div>
          ))}
        </div>
      ) : null}
      <Dropzone accept="*/*" hint="執行檔、pcap、zip 都可以。瀏覽器用預簽名網址直接傳到 R2。" onFile={add} />
      {anySimulated ? (
        <div className="flex items-start gap-2.5 rounded-xl border border-amber/40 bg-amber/[0.07] px-4 py-3">
          <AlertTriangle size={15} className="mt-0.5 shrink-0 text-amber" />
          <p className="text-[12.5px] leading-relaxed text-fg-2">
            <span className="font-bold text-amber">附件是模擬上傳的，檔案沒有真的進到 R2。</span>
            學員按下載會拿不到東西。請先設定 <span className="font-mono">R2_*</span> 再重新上傳一次。
          </p>
        </div>
      ) : null}
      <p className="font-mono text-[11px] leading-relaxed text-fg-3">
        {api.mode === "local" ? "本機模式：上傳是模擬的。接上 R2_* 後檔案會真的進到 bucket。" : "檔案路徑：challenges/{slug}/{檔名}，前台用 R2_PUBLIC_URL 提供下載。"}
      </p>
      <span className={buttonClass("ghost", "sm", "hidden")} />
    </div>
  );
}
