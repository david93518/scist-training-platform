"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Calendar, Check, Loader2, MapPin, Users } from "lucide-react";
import { Icon } from "@/components/ui/icon";
import { Button, ProgressBar } from "@/components/ui/primitives";
import { EVENT_META, type SciEvent } from "@/data/events";
import type { Instructor } from "@/data/instructors";
import { api } from "@/lib/api";
import { useProgress, useHydrated } from "@/store/progress";
import { cn, formatDateTime } from "@/lib/utils";

export function EventList({ events, instructors }: { events: SciEvent[]; instructors: Instructor[] }) {
  const registered = useProgress((s) => s.registeredEvents);
  const toggle = useProgress((s) => s.toggleEvent);
  const authenticated = useProgress((s) => s.authenticated);
  const hydrated = useHydrated();
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const sorted = [...events].sort(
    (a, b) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime(),
  );

  const change = async (e: SciEvent, joined: boolean) => {
    setError(null);
    if (!authenticated) {
      toggle(e.id);
      return;
    }
    setBusy(e.id);
    try {
      await api("/api/events/" + e.id + "/register", { body: { on: !joined } });
      toggle(e.id);
      // the seat count on the card comes from the server
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "報名失敗");
    } finally {
      setBusy(null);
    }
  };

  if (sorted.length === 0) {
    return <p className="card p-8 text-center text-[13.5px] text-fg-3">近期沒有活動。到後台「活動」新增一場。</p>;
  }

  return (
    <div className="flex flex-col gap-4">
      {error ? <p className="rounded-lg border border-red/40 bg-red/10 px-3 py-2 text-[12.5px] text-fg-2">{error}</p> : null}
      {sorted.map((e, i) => {
        const meta = EVENT_META[e.type];
        const host = instructors.find((x) => x.id === e.hostId);
        const joined = hydrated && registered.includes(e.id);
        // signed-in registrations are already in the server count
        const seats = e.registered + (joined && !authenticated ? 1 : 0);
        return (
          <div
            key={e.id}
            className={cn(
              "card reveal grid gap-5 p-6 lg:grid-cols-[auto_1fr_auto] lg:items-center",
              joined && "border-accent/35",
            )}
            style={{ transitionDelay: i * 50 + "ms" }}
          >
            <span
              className="clip-hex grid h-14 w-14 shrink-0 place-items-center"
              style={{ background: meta.color + "1f" }}
            >
              <Icon name={meta.icon} size={22} style={{ color: meta.color }} />
            </span>

            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <span
                  className="font-mono text-[10.5px] tracking-wider"
                  style={{ color: meta.color }}
                >
                  {meta.label.toUpperCase()}
                </span>
                <span className="rounded border border-line px-1.5 py-px text-[10.5px] text-fg-3">
                  {e.mode}
                </span>
                {joined ? (
                  <span className="flex items-center gap-1 rounded border border-accent/40 bg-accent/10 px-1.5 py-px font-mono text-[10px] text-accent">
                    <Check size={9} strokeWidth={3} />
                    已報名
                  </span>
                ) : null}
              </div>

              <h3 className="mt-1.5 text-[18px] font-bold tracking-tight">{e.title}</h3>
              <p className="mt-2 max-w-2xl text-[13.5px] leading-relaxed text-fg-2">
                {e.summary}
              </p>

              <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-1.5 font-mono text-[11.5px] text-fg-3">
                <span className="flex items-center gap-1.5">
                  <Calendar size={12} />
                  {formatDateTime(e.startsAt)} · {e.durationMin} 分鐘
                </span>
                <span className="flex items-center gap-1.5">
                  <MapPin size={12} />
                  {e.location}
                </span>
                {host ? <span>主持 @{host.handle}</span> : null}
              </div>

              <div className="mt-3 flex flex-wrap gap-1.5">
                {e.tags.map((t) => (
                  <span
                    key={t}
                    className="rounded-md border border-line bg-bg-3/50 px-2 py-0.5 text-[11px] text-fg-2"
                  >
                    {t}
                  </span>
                ))}
              </div>
            </div>

            <div className="flex w-full shrink-0 flex-col gap-2.5 lg:w-[180px]">
              <div className="flex items-center justify-between font-mono text-[11.5px] text-fg-3">
                <span className="flex items-center gap-1">
                  <Users size={11} />
                  {seats}/{e.capacity}
                </span>
                <span>{Math.round((seats / e.capacity) * 100)}%</span>
              </div>
              <ProgressBar
                value={seats / e.capacity}
                color={seats / e.capacity > 0.9 ? "var(--color-red)" : meta.color}
                height={5}
              />
              <Button
                variant={joined ? "outline" : "primary"}
                size="sm"
                disabled={busy === e.id || (!joined && seats >= e.capacity)}
                onClick={() => change(e, joined)}
              >
                {busy === e.id ? <Loader2 size={13} className="animate-spin" /> : null}
                {joined ? "取消報名" : seats >= e.capacity ? "已額滿" : "我要報名"}
              </Button>
            </div>
          </div>
        );
      })}
      {hydrated && !authenticated ? <p className="font-mono text-[11.5px] text-fg-3">未登入的報名只記在這台瀏覽器。登入後報名才會佔到名額。</p> : null}
    </div>
  );
}
