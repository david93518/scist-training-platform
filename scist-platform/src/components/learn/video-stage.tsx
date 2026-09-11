"use client";

import { useEffect, useEffectEvent, useMemo, useRef, useState } from "react";
import { Play, Pause, RotateCcw, Captions, Maximize2, Volume2, Gauge, Film } from "lucide-react";
import { cn, formatDuration } from "@/lib/utils";
import { CALLOUT_META, isCallout } from "@/lib/callout";
import { checkpointProgress } from "@/lib/checkpoint";
import type { Lesson } from "@/data/tracks";

/** Where the lecture comes from. `none` renders the code-replay stand-in. */
export interface LessonVideo {
  provider: "none" | "youtube" | "stream";
  videoId: string | null;
  /** Cloudflare Stream iframe URL; computed server-side from the customer code */
  url: string | null;
}

export const NO_VIDEO: LessonVideo = { provider: "none", videoId: null, url: null };

/* ---------------- tiny syntax highlighter for the code replay ---------------- */
const KEYWORDS = new Set([
  "SELECT", "FROM", "WHERE", "AND", "OR", "INSERT", "UPDATE", "DELETE", "GET", "POST", "HTTP/1.1",
  "import", "from", "def", "for", "in", "return", "if", "else", "print", "char", "int", "void",
  "break", "run", "gdb", "strings", "grep", "find", "binwalk", "exiftool", "pip", "python3", "nc",
]);

type Tok = { t: string; c: string };

function tokenize(line: string): Tok[] {
  const trimmed = line.trimStart();
  if (trimmed.startsWith("#") || trimmed.startsWith("--") || trimmed.startsWith("//") || trimmed.startsWith("<!--")) {
    return [{ t: line, c: "var(--color-fg-3)" }];
  }
  const out: Tok[] = [];
  const re = /("[^"]*"|'[^']*')|(\b\d+(?:\.\d+)?\b|0x[0-9a-fA-F]+)|([A-Za-z_][\w/.-]*)|(\s+)|(.)/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(line))) {
    if (m[1]) out.push({ t: m[1], c: "var(--color-amber)" });
    else if (m[2]) out.push({ t: m[2], c: "var(--color-teal)" });
    else if (m[3]) out.push({ t: m[3], c: KEYWORDS.has(m[3]) ? "var(--color-accent)" : "var(--color-fg)" });
    else if (m[4]) out.push({ t: m[4], c: "inherit" });
    else out.push({ t: m[5], c: "var(--color-fg-2)" });
  }
  return out;
}

/* ---------------- external players ---------------- */
interface YTPlayer {
  playVideo(): void;
  pauseVideo(): void;
  seekTo(seconds: number, allowSeekAhead?: boolean): void;
  getCurrentTime(): number;
  getDuration(): number;
  setPlaybackRate(rate: number): void;
  destroy(): void;
}

interface StreamPlayer {
  play(): Promise<void> | void;
  pause(): void;
  currentTime: number;
  duration: number;
  playbackRate: number;
  addEventListener(type: string, listener: () => void): void;
}

declare global {
  interface Window {
    YT?: {
      Player: new (
        el: HTMLElement,
        opts: {
          videoId: string;
          width?: string;
          height?: string;
          playerVars?: Record<string, string | number>;
          events?: { onReady?: () => void; onStateChange?: (e: { data: number }) => void };
        },
      ) => YTPlayer;
      PlayerState: { PLAYING: number; PAUSED: number; ENDED: number; BUFFERING: number };
    };
    onYouTubeIframeAPIReady?: () => void;
    Stream?: (el: HTMLIFrameElement) => StreamPlayer;
  }
}

/** One interface over both providers so the stage does not care which it is. */
interface Adapter {
  play(): void;
  pause(): void;
  seek(position: number): void;
  position(): number;
  seconds(): number;
  duration(): number;
  rate(r: number): void;
  destroy(): void;
}

let ytLoader: Promise<void> | null = null;
function loadYouTubeApi() {
  if (typeof window === "undefined") return Promise.resolve();
  if (window.YT?.Player) return Promise.resolve();
  if (!ytLoader) {
    ytLoader = new Promise<void>((resolve) => {
      const previous = window.onYouTubeIframeAPIReady;
      window.onYouTubeIframeAPIReady = () => {
        previous?.();
        resolve();
      };
      const s = document.createElement("script");
      s.src = "https://www.youtube.com/iframe_api";
      s.async = true;
      document.head.appendChild(s);
    });
  }
  return ytLoader;
}

let streamLoader: Promise<void> | null = null;
function loadStreamSdk() {
  if (typeof window === "undefined") return Promise.resolve();
  if (window.Stream) return Promise.resolve();
  if (!streamLoader) {
    streamLoader = new Promise<void>((resolve) => {
      const s = document.createElement("script");
      s.src = "https://embed.cloudflarestream.com/embed/sdk.latest.js";
      s.async = true;
      s.onload = () => resolve();
      document.head.appendChild(s);
    });
  }
  return streamLoader;
}

interface FrameProps {
  video: LessonVideo;
  playing: boolean;
  position: number;
  speed: number;
  onProgress: (position: number, seconds: number, duration: number) => void;
  onPlayingChange: (playing: boolean) => void;
  onEnded: () => void;
}

/**
 * Mounts the real player and keeps it in step with the stage: the stage's
 * `playing` / `position` / `speed` drive the player, and the player's own
 * events and clock flow back up through the callbacks.
 */
function ProviderFrame({ video, playing, position, speed, onProgress, onPlayingChange, onEnded }: FrameProps) {
  const hostRef = useRef<HTMLDivElement>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const adapterRef = useRef<Adapter | null>(null);
  const reported = useRef(0);
  // ready is keyed by the source so a new video starts out not-ready without
  // a state reset inside the effect
  const key = video.provider + ":" + (video.videoId ?? "") + ":" + (video.url ?? "");
  const [readyKey, setReadyKey] = useState<string | null>(null);
  const ready = readyKey === key;

  const progress = useEffectEvent(onProgress);
  const playingChange = useEffectEvent(onPlayingChange);
  const ended = useEffectEvent(onEnded);

  // create / destroy the player
  useEffect(() => {
    let cancelled = false;
    const thisKey = video.provider + ":" + (video.videoId ?? "") + ":" + (video.url ?? "");

    if (video.provider === "youtube" && video.videoId) {
      let player: YTPlayer | null = null;
      const host = hostRef.current;
      loadYouTubeApi().then(() => {
        if (cancelled || !host || !window.YT) return;
        const el = document.createElement("div");
        host.replaceChildren(el);
        player = new window.YT.Player(el, {
          videoId: video.videoId!,
          width: "100%",
          height: "100%",
          playerVars: { rel: 0, modestbranding: 1, playsinline: 1, controls: 1, origin: window.location.origin },
          events: {
            onReady: () => {
              const p = player!;
              adapterRef.current = {
                play: () => p.playVideo(),
                pause: () => p.pauseVideo(),
                seek: (pos) => p.seekTo(pos * (p.getDuration() || 0), true),
                position: () => (p.getDuration() ? p.getCurrentTime() / p.getDuration() : 0),
                seconds: () => p.getCurrentTime(),
                duration: () => p.getDuration(),
                rate: (r) => p.setPlaybackRate(r),
                destroy: () => p.destroy(),
              };
              setReadyKey(thisKey);
            },
            onStateChange: (e) => {
              const S = window.YT!.PlayerState;
              if (e.data === S.PLAYING) playingChange(true);
              else if (e.data === S.PAUSED) playingChange(false);
              else if (e.data === S.ENDED) {
                playingChange(false);
                ended();
              }
            },
          },
        });
      });
      return () => {
        cancelled = true;
        adapterRef.current = null;
        player?.destroy();
        host?.replaceChildren();
      };
    }

    if (video.provider === "stream" && video.url) {
      const iframe = iframeRef.current;
      loadStreamSdk().then(() => {
        if (cancelled || !iframe || !window.Stream) return;
        const p = window.Stream(iframe);
        adapterRef.current = {
          play: () => void p.play(),
          pause: () => p.pause(),
          seek: (pos) => {
            p.currentTime = pos * (p.duration || 0);
          },
          position: () => (p.duration ? p.currentTime / p.duration : 0),
          seconds: () => p.currentTime,
          duration: () => p.duration,
          rate: (r) => {
            p.playbackRate = r;
          },
          destroy: () => undefined,
        };
        p.addEventListener("play", () => playingChange(true));
        p.addEventListener("pause", () => playingChange(false));
        p.addEventListener("ended", () => {
          playingChange(false);
          ended();
        });
        setReadyKey(thisKey);
      });
      return () => {
        cancelled = true;
        adapterRef.current = null;
      };
    }
    return undefined;
  }, [video.provider, video.videoId, video.url]);

  // clock: report the player's position while it plays
  useEffect(() => {
    if (!ready || !playing) return;
    const id = setInterval(() => {
      const a = adapterRef.current;
      if (!a) return;
      const p = a.position();
      reported.current = p;
      progress(p, a.seconds(), a.duration());
    }, 250);
    return () => clearInterval(id);
  }, [ready, playing]);

  // desired state → player
  useEffect(() => {
    const a = adapterRef.current;
    if (!ready || !a) return;
    if (playing) a.play();
    else a.pause();
  }, [ready, playing]);

  useEffect(() => {
    const a = adapterRef.current;
    if (!ready || !a) return;
    // only real seeks; the stage echoing our own progress report is ignored
    if (Math.abs(position - reported.current) > 0.02) {
      a.seek(position);
      reported.current = position;
    }
  }, [ready, position]);

  useEffect(() => {
    const a = adapterRef.current;
    if (!ready || !a) return;
    a.rate(speed);
  }, [ready, speed]);

  if (video.provider === "stream" && video.url) {
    return (
      <iframe
        ref={iframeRef}
        src={video.url + "?preload=true"}
        title="課程影片"
        className="absolute inset-0 h-full w-full"
        allow="accelerometer; gyroscope; autoplay; encrypted-media; picture-in-picture;"
        allowFullScreen
      />
    );
  }
  return <div ref={hostRef} className="absolute inset-0 [&>div]:h-full [&>div]:w-full [&_iframe]:h-full [&_iframe]:w-full" />;
}

/* ---------------- the stage ---------------- */
export function VideoStage({
  lesson,
  video = NO_VIDEO,
  index,
  position,
  playing,
  accent,
  blocked,
  speed,
  captions,
  onTogglePlay,
  onSeek,
  onRestart,
  onSpeedChange,
  onToggleCaptions,
  onProgress,
  onPlayingChange,
  onEnded,
}: {
  lesson: Lesson;
  video?: LessonVideo;
  index: number;
  position: number;
  playing: boolean;
  accent: string;
  blocked: boolean;
  speed: number;
  captions: boolean;
  onTogglePlay: () => void;
  onSeek: (p: number) => void;
  onRestart: () => void;
  onSpeedChange: (s: number) => void;
  onToggleCaptions: () => void;
  /** real players only: the player's clock */
  onProgress?: (p: number) => void;
  onPlayingChange?: (playing: boolean) => void;
  onEnded?: () => void;
}) {
  const barRef = useRef<HTMLDivElement>(null);
  const real = video.provider !== "none" && Boolean(video.provider === "stream" ? video.url : video.videoId);
  const [clock, setClock] = useState<{ seconds: number; duration: number } | null>(null);

  const codeLines = useMemo(() => {
    const block = lesson.content.find((b) => b.type === "code");
    return block && block.type === "code" ? block.lines : [];
  }, [lesson]);

  const tokens = useMemo(() => codeLines.map(tokenize), [codeLines]);

  const caption = useMemo(() => {
    const tips = lesson.content.filter(isCallout).filter((b) => b.text.trim());
    if (tips.length > 0) {
      const idx = Math.min(tips.length - 1, Math.floor(position * tips.length));
      const tip = tips[idx];
      return { label: CALLOUT_META[tip.tone].label, text: tip.text };
    }
    const paras = lesson.content.filter((b) => b.type === "p");
    if (paras.length === 0) return { label: null, text: lesson.summary };
    const idx = Math.min(paras.length - 1, Math.floor(position * paras.length));
    const p = paras[idx];
    return { label: null, text: p.type === "p" ? p.text : lesson.summary };
  }, [lesson, position]);

  const revealed = Math.ceil(position * codeLines.length);
  const seconds = real && clock ? clock.seconds : position * lesson.durationSec;
  const total = real && clock && clock.duration > 0 ? clock.duration : lesson.durationSec;

  const seekFromEvent = (clientX: number) => {
    const el = barRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    onSeek(Math.min(1, Math.max(0, (clientX - r.left) / r.width)));
  };

  return (
    <div className="overflow-hidden rounded-2xl border border-white/[0.08] bg-bg-0 shadow-[0_30px_80px_-40px_rgba(0,0,0,1),inset_0_1px_0_rgba(255,255,255,0.05)]">
      {/* stage */}
      <div className="relative aspect-video w-full overflow-hidden bg-black">
        {real ? (
          <ProviderFrame
            video={video}
            playing={playing}
            position={position}
            speed={speed}
            onProgress={(p, s, d) => {
              setClock({ seconds: s, duration: d });
              onProgress?.(p);
            }}
            onPlayingChange={(v) => onPlayingChange?.(v)}
            onEnded={() => onEnded?.()}
          />
        ) : (
          <>
            <div
              className="absolute inset-0"
              style={{
                background:
                  "radial-gradient(900px 400px at 20% -10%, " + accent + "26, transparent 60%), radial-gradient(500px 300px at 100% 100%, " + accent + "10, transparent 60%), linear-gradient(180deg, #0c1219, #06090e)",
              }}
            />
            <div className="hex-grid absolute inset-0 opacity-60" />
            {/* vignette + scanlines */}
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_55%,rgba(0,0,0,0.55))]" />
            <div className="pointer-events-none absolute inset-0 opacity-[0.07] [background:repeating-linear-gradient(0deg,rgba(255,255,255,0.5)_0,rgba(255,255,255,0.5)_1px,transparent_1px,transparent_3px)]" />

            {/* code replay */}
            <div className="absolute inset-0 flex flex-col justify-center p-6 sm:p-12">
              {codeLines.length > 0 ? (
                <pre className="overflow-hidden font-mono text-[11.5px] leading-[1.9] sm:text-[16px] sm:leading-[1.9]">
                  <code>
                    {tokens.map((line, i) => (
                      <div
                        key={i}
                        className="flex transition-all duration-500"
                        style={{
                          opacity: i < revealed ? 1 : 0.26,
                          transform: i < revealed ? "none" : "translateY(4px)",
                        }}
                      >
                        <span className="mr-5 w-5 shrink-0 select-none text-right text-fg-3/50">{i + 1}</span>
                        <span
                          className="relative"
                          style={
                            i === revealed - 1
                              ? { textShadow: "0 0 18px " + accent + "99" }
                              : undefined
                          }
                        >
                          {line.map((tk, k) => (
                            <span key={k} style={{ color: tk.c }}>
                              {tk.t}
                            </span>
                          ))}
                          {line.length === 0 ? " " : null}
                        </span>
                      </div>
                    ))}
                  </code>
                </pre>
              ) : (
                <div className="text-center">
                  <div className="font-mono text-[13px] tracking-[0.3em] text-fg-3">SCIST GATE · 課程錄影</div>
                  <div className="display mt-4 text-[30px]">{lesson.title}</div>
                </div>
              )}
            </div>
          </>
        )}

        {/* big play button */}
        {!playing ? (
          <button
            onClick={onTogglePlay}
            disabled={blocked}
            className={cn("absolute inset-0 grid place-items-center transition-colors disabled:cursor-not-allowed", real ? "bg-bg-0/45 hover:bg-bg-0/30" : "bg-bg-0/25 hover:bg-bg-0/15")}
            aria-label="播放"
          >
            <span className="relative grid place-items-center">
              <span className="absolute h-20 w-20 rounded-full animate-ring" style={{ background: accent + "55" }} />
              <span className="absolute h-20 w-20 rounded-full animate-ring [animation-delay:1.3s]" style={{ background: accent + "44" }} />
              <span
                className="relative grid h-20 w-20 place-items-center rounded-full shadow-[0_20px_50px_-15px_rgba(0,0,0,0.9)] transition-transform hover:scale-105"
                style={{ background: "linear-gradient(145deg, " + accent + ", " + accent + "aa)" }}
              >
                <Play size={30} className="ml-1 text-bg-0" fill="currentColor" />
              </span>
            </span>
          </button>
        ) : null}

        {/* badges */}
        <div className="pointer-events-none absolute left-4 top-4 flex items-center gap-2">
          <span className="flex items-center gap-2 rounded-lg border border-white/10 bg-bg-0/70 px-2.5 py-1.5 backdrop-blur">
            <span className="h-1.5 w-1.5 rounded-full" style={{ background: playing ? accent : "var(--color-fg-3)", boxShadow: playing ? "0 0 10px " + accent : "none" }} />
            <span className="font-mono text-[10.5px] tracking-[0.2em] text-fg-2">{playing ? "PLAYING" : "PAUSED"}</span>
          </span>
          <span className="rounded-lg border border-white/10 bg-bg-0/70 px-2.5 py-1.5 font-mono text-[10.5px] tracking-[0.2em] text-fg-3 backdrop-blur">
            LESSON {String(index + 1).padStart(2, "0")}
          </span>
          {real ? (
            <span className="flex items-center gap-1.5 rounded-lg border border-white/10 bg-bg-0/70 px-2.5 py-1.5 font-mono text-[10.5px] tracking-[0.2em] text-fg-3 backdrop-blur">
              <Film size={11} />
              {video.provider === "youtube" ? "YOUTUBE" : "STREAM"}
            </span>
          ) : null}
        </div>

        {/* captions */}
        {captions && caption.text ? (
          <div className="pointer-events-none absolute inset-x-4 bottom-4 sm:inset-x-12">
            <div className="mx-auto max-w-2xl rounded-xl border border-white/[0.06] bg-bg-0/85 px-5 py-2.5 text-center backdrop-blur">
              {caption.label ? (
                <div className="mb-1 font-mono text-[10.5px] tracking-widest text-accent">{caption.label}</div>
              ) : null}
              <p className="text-[13px] leading-relaxed text-fg sm:text-[15px]">{caption.text}</p>
            </div>
          </div>
        ) : null}
      </div>

      {/* controls */}
      <div className="border-t border-white/[0.06] bg-bg-1/80 px-4 py-3 backdrop-blur">
        <div
          ref={barRef}
          className="group relative h-5 cursor-pointer"
          onClick={(e) => seekFromEvent(e.clientX)}
          role="slider"
          aria-label="播放進度"
          aria-valuenow={Math.round(position * 100)}
          aria-valuemin={0}
          aria-valuemax={100}
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === "ArrowRight") onSeek(Math.min(1, position + 0.05));
            if (e.key === "ArrowLeft") onSeek(Math.max(0, position - 0.05));
          }}
        >
          <div className="absolute inset-x-0 top-1/2 h-1.5 -translate-y-1/2 overflow-hidden rounded-full bg-white/[0.08] transition-[height] group-hover:h-2.5">
            <div
              className="h-full rounded-full"
              style={{ width: position * 100 + "%", background: accent, boxShadow: "0 0 12px " + accent }}
            />
          </div>
          {lesson.checkpoints.map((c, i) => {
            const at = checkpointProgress(c.at, lesson.durationSec);
            return (
              <span
                key={i}
                title={"知識點檢查站 " + (i + 1)}
                className="clip-hex absolute top-1/2 h-3.5 w-3.5 -translate-x-1/2 -translate-y-1/2 transition-transform group-hover:scale-125"
                style={{
                  left: at * 100 + "%",
                  background: position >= at ? "var(--color-amber)" : "var(--color-line-2)",
                  boxShadow: position >= at ? "0 0 10px var(--color-amber)" : "none",
                }}
              />
            );
          })}
        </div>

        <div className="mt-1.5 flex items-center gap-3.5">
          <button
            onClick={onTogglePlay}
            disabled={blocked}
            className="grid h-8 w-8 place-items-center rounded-lg bg-white/[0.06] text-fg transition-colors hover:bg-white/[0.12] disabled:opacity-40"
            aria-label={playing ? "暫停" : "播放"}
          >
            {playing ? <Pause size={15} /> : <Play size={15} className="ml-0.5" />}
          </button>
          <button onClick={onRestart} className="text-fg-3 transition-colors hover:text-fg" aria-label="重新開始">
            <RotateCcw size={15} />
          </button>
          <Volume2 size={15} className="hidden text-fg-3 sm:block" />

          <span className="font-mono text-[12px] tabular-nums text-fg-2">
            {formatDuration(seconds)} <span className="text-fg-3">/ {formatDuration(total)}</span>
          </span>

          <div className="ml-auto flex items-center gap-2.5">
            <span className="hidden items-center gap-1 sm:flex">
              <Gauge size={14} className="mr-1 text-fg-3" />
              {[1, 1.5, 2].map((s) => (
                <button
                  key={s}
                  onClick={() => onSpeedChange(s)}
                  className={cn(
                    "rounded-md px-1.5 py-0.5 font-mono text-[11px] transition-colors",
                    speed === s ? "bg-white/[0.1] text-fg" : "text-fg-3 hover:text-fg-2",
                  )}
                >
                  {s}x
                </button>
              ))}
            </span>
            <button
              onClick={onToggleCaptions}
              className={cn("rounded-md px-1.5 py-0.5 transition-colors", captions ? "text-accent" : "text-fg-3 hover:text-fg-2")}
              aria-label="字幕"
              aria-pressed={captions}
            >
              <Captions size={16} />
            </button>
            <Maximize2 size={15} className="text-fg-3" />
          </div>
        </div>
      </div>
    </div>
  );
}
