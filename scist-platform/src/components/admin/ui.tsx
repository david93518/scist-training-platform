"use client";

/**
 * Small form + table kit for the admin console. Same tokens as the public
 * site so the console feels like the same product.
 */
import Link from "next/link";
import { useCallback, useEffect, useEffectEvent, useState } from "react";
import { create } from "zustand";
import { ArrowDown, ArrowUp, Check, Loader2, Plus, Trash2, X, AlertTriangle, Info } from "lucide-react";
import { Button, buttonClass } from "@/components/ui/primitives";
import { cn } from "@/lib/utils";
import type { Status } from "@/admin/types";

/* ------------------------------ async helper ------------------------------ */
export function useAsync<T>(loader: () => Promise<T>, deps: unknown[] = []) {
  const [state, setState] = useState<{ data: T | null; error: string | null; loading: boolean }>({
    data: null,
    error: null,
    loading: true,
  });
  const [tick, setTick] = useState(0);

  useEffect(() => {
    let alive = true;
    loader()
      .then((data) => alive && setState({ data, error: null, loading: false }))
      .catch((e) => alive && setState((s) => ({ ...s, error: e instanceof Error ? e.message : String(e), loading: false })));
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tick, ...deps]);

  const reload = useCallback(async () => setTick((t) => t + 1), []);
  const setData = useCallback((data: T | null) => setState((s) => ({ ...s, data })), []);

  return { ...state, reload, setData };
}

/* ------------------------------ toasts ------------------------------ */
interface Toast {
  id: number;
  text: string;
  tone: "ok" | "err" | "info";
}
interface ToastStore {
  toasts: Toast[];
  push: (text: string, tone?: Toast["tone"]) => void;
  dismiss: (id: number) => void;
}
export const useToast = create<ToastStore>((set) => ({
  toasts: [],
  push: (text, tone = "ok") => {
    const id = Date.now() + Math.random();
    set((s) => ({ toasts: [...s.toasts, { id, text, tone }] }));
    setTimeout(() => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })), 3600);
  },
  dismiss: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
}));

export function ToastHost() {
  const toasts = useToast((s) => s.toasts);
  const dismiss = useToast((s) => s.dismiss);
  return (
    <div className="pointer-events-none fixed bottom-5 right-5 z-[120] flex w-80 flex-col gap-2">
      {toasts.map((t) => (
        <div
          key={t.id}
          className={cn(
            "pointer-events-auto flex items-start gap-2.5 rounded-xl border px-3.5 py-3 text-[13px] shadow-[0_20px_50px_-20px_rgba(0,0,0,1)] backdrop-blur",
            t.tone === "ok" && "border-accent/40 bg-bg-1/95 text-fg",
            t.tone === "err" && "border-red/40 bg-bg-1/95 text-fg",
            t.tone === "info" && "border-blue/40 bg-bg-1/95 text-fg",
          )}
        >
          {t.tone === "ok" ? <Check size={15} className="mt-0.5 shrink-0 text-accent" strokeWidth={3} /> : null}
          {t.tone === "err" ? <AlertTriangle size={15} className="mt-0.5 shrink-0 text-red" /> : null}
          {t.tone === "info" ? <Info size={15} className="mt-0.5 shrink-0 text-blue" /> : null}
          <span className="flex-1 leading-relaxed">{t.text}</span>
          <button onClick={() => dismiss(t.id)} className="text-fg-3 hover:text-fg" aria-label="關閉">
            <X size={13} />
          </button>
        </div>
      ))}
    </div>
  );
}

/* ------------------------------ page chrome ------------------------------ */
export function PageTitle({
  kicker,
  title,
  desc,
  actions,
}: {
  kicker?: string;
  title: string;
  desc?: React.ReactNode;
  actions?: React.ReactNode;
}) {
  return (
    <div className="mb-7 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div>
        {kicker ? <div className="kicker mb-2">{kicker}</div> : null}
        <h1 className="display text-[28px] sm:text-[34px]">{title}</h1>
        {desc ? <p className="mt-2 max-w-2xl text-[14px] leading-relaxed text-fg-2">{desc}</p> : null}
      </div>
      {actions ? <div className="flex shrink-0 flex-wrap gap-2">{actions}</div> : null}
    </div>
  );
}

export function SectionCard({
  title,
  desc,
  children,
  className,
  right,
}: {
  title: string;
  desc?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  right?: React.ReactNode;
}) {
  return (
    <section className={cn("card p-6", className)}>
      <div className="mb-5 flex items-start justify-between gap-4">
        <div>
          <h2 className="text-[16px] font-extrabold">{title}</h2>
          {desc ? <p className="mt-1 text-[13px] leading-relaxed text-fg-3">{desc}</p> : null}
        </div>
        {right}
      </div>
      {children}
    </section>
  );
}

export function EmptyState({ title, desc, action }: { title: string; desc?: string; action?: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed border-white/[0.1] px-6 py-12 text-center">
      <div className="text-[15px] font-bold">{title}</div>
      {desc ? <p className="max-w-sm text-[13px] text-fg-3">{desc}</p> : null}
      {action ? <div className="mt-3">{action}</div> : null}
    </div>
  );
}

/* ------------------------------ fields ------------------------------ */
export function Field({
  label,
  hint,
  children,
  className,
  required,
}: {
  label: string;
  hint?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  required?: boolean;
}) {
  return (
    <label className={cn("flex flex-col gap-1.5", className)}>
      <span className="mono-label flex items-center gap-1">
        {label}
        {required ? <span className="text-accent">*</span> : null}
      </span>
      {children}
      {hint ? <span className="text-[11.5px] leading-relaxed text-fg-3">{hint}</span> : null}
    </label>
  );
}

const control =
  "w-full rounded-lg border border-white/[0.08] bg-bg-0 px-3 text-[14px] text-fg outline-none transition-colors placeholder:text-fg-3 focus:border-accent/50 disabled:opacity-50";

export function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={cn(control, "h-10", props.className)} />;
}

export function Textarea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea {...props} className={cn(control, "min-h-[88px] resize-y py-2.5 leading-relaxed", props.className)} />;
}

export function Select(props: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return <select {...props} className={cn(control, "h-10 cursor-pointer appearance-auto", props.className)} />;
}

export function Toggle({
  checked,
  onChange,
  label,
  hint,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
  hint?: string;
}) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className="flex w-full items-center gap-3 rounded-lg border border-white/[0.08] bg-white/[0.02] px-3.5 py-3 text-left transition-colors hover:border-white/20"
      role="switch"
      aria-checked={checked}
    >
      <span
        className={cn("relative h-5 w-9 shrink-0 rounded-full transition-colors", checked ? "bg-accent" : "bg-white/15")}
      >
        <span
          className={cn(
            "absolute top-0.5 h-4 w-4 rounded-full bg-bg-0 transition-transform",
            checked ? "left-0.5 translate-x-4" : "left-0.5",
          )}
        />
      </span>
      <span className="min-w-0">
        <span className="block text-[13.5px] font-bold">{label}</span>
        {hint ? <span className="block text-[11.5px] text-fg-3">{hint}</span> : null}
      </span>
    </button>
  );
}

export function TagInput({
  value,
  onChange,
  placeholder = "輸入後按 Enter",
}: {
  value: string[];
  onChange: (v: string[]) => void;
  placeholder?: string;
}) {
  const [draft, setDraft] = useState("");
  return (
    <div className={cn(control, "flex min-h-10 flex-wrap items-center gap-1.5 py-1.5")}>
      {value.map((t, i) => (
        <span key={t + i} className="flex items-center gap-1 rounded-md border border-white/[0.1] bg-white/[0.05] px-2 py-0.5 text-[12px]">
          {t}
          <button type="button" onClick={() => onChange(value.filter((_, k) => k !== i))} aria-label="移除">
            <X size={11} className="text-fg-3 hover:text-fg" />
          </button>
        </span>
      ))}
      <input
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={(e) => {
          if ((e.key === "Enter" || e.key === ",") && draft.trim()) {
            e.preventDefault();
            onChange([...value, draft.trim()]);
            setDraft("");
          }
          if (e.key === "Backspace" && !draft && value.length) onChange(value.slice(0, -1));
        }}
        placeholder={value.length ? "" : placeholder}
        className="min-w-[120px] flex-1 bg-transparent text-[13px] outline-none placeholder:text-fg-3"
      />
    </div>
  );
}

/* ------------------------------ status ------------------------------ */
const STATUS: Record<Status, { label: string; color: string }> = {
  draft: { label: "草稿", color: "#ffb84d" },
  published: { label: "已發布", color: "#a4f13b" },
  archived: { label: "已封存", color: "#6b7a8e" },
};

export function StatusBadge({ status }: { status: Status }) {
  const s = STATUS[status];
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-md border px-2 py-0.5 font-mono text-[10.5px] tracking-wider"
      style={{ color: s.color, borderColor: s.color + "55", background: s.color + "14" }}
    >
      <span className="h-1.5 w-1.5 rounded-full" style={{ background: s.color }} />
      {s.label}
    </span>
  );
}

export function StatusSelect({ value, onChange }: { value: Status; onChange: (s: Status) => void }) {
  return (
    <div className="flex gap-1.5">
      {(Object.keys(STATUS) as Status[]).map((s) => (
        <button
          key={s}
          type="button"
          onClick={() => onChange(s)}
          className={cn(
            "rounded-lg border px-3 py-1.5 text-[12.5px] font-bold transition-colors",
            value === s ? "text-bg-0" : "border-white/[0.08] bg-white/[0.02] text-fg-2 hover:text-fg",
          )}
          style={value === s ? { background: STATUS[s].color, borderColor: STATUS[s].color } : undefined}
        >
          {STATUS[s].label}
        </button>
      ))}
    </div>
  );
}

/* ------------------------------ repeater ------------------------------ */
export function Repeater<T>({
  items,
  onChange,
  render,
  make,
  addLabel = "新增",
  empty,
}: {
  items: T[];
  onChange: (items: T[]) => void;
  render: (item: T, update: (patch: Partial<T>) => void, index: number) => React.ReactNode;
  make: () => T;
  addLabel?: string;
  empty?: string;
}) {
  const move = (i: number, d: -1 | 1) => {
    const j = i + d;
    if (j < 0 || j >= items.length) return;
    const next = [...items];
    [next[i], next[j]] = [next[j], next[i]];
    onChange(next);
  };
  return (
    <div className="flex flex-col gap-3">
      {items.length === 0 && empty ? <p className="text-[13px] text-fg-3">{empty}</p> : null}
      {items.map((item, i) => (
        <div key={i} className="rounded-xl border border-white/[0.08] bg-white/[0.02] p-4">
          <div className="mb-3 flex items-center justify-between">
            <span className="mono-label">#{i + 1}</span>
            <div className="flex items-center gap-1">
              <button type="button" onClick={() => move(i, -1)} className="rounded-md p-1.5 text-fg-3 hover:bg-white/[0.06] hover:text-fg" aria-label="上移" disabled={i === 0}>
                <ArrowUp size={13} />
              </button>
              <button type="button" onClick={() => move(i, 1)} className="rounded-md p-1.5 text-fg-3 hover:bg-white/[0.06] hover:text-fg" aria-label="下移" disabled={i === items.length - 1}>
                <ArrowDown size={13} />
              </button>
              <button type="button" onClick={() => onChange(items.filter((_, k) => k !== i))} className="rounded-md p-1.5 text-fg-3 hover:bg-red/15 hover:text-red" aria-label="刪除">
                <Trash2 size={13} />
              </button>
            </div>
          </div>
          {render(item, (patch) => onChange(items.map((x, k) => (k === i ? { ...x, ...patch } : x))), i)}
        </div>
      ))}
      <button type="button" onClick={() => onChange([...items, make()])} className={buttonClass("outline", "sm", "self-start")}>
        <Plus size={14} />
        {addLabel}
      </button>
    </div>
  );
}

/* ------------------------------ table ------------------------------ */
export function Table({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={cn("card overflow-hidden", className)}>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[640px] text-[13.5px]">{children}</table>
      </div>
    </div>
  );
}
export function Th({ children, className }: { children?: React.ReactNode; className?: string }) {
  return <th className={cn("mono-label whitespace-nowrap px-4 py-3 text-left font-normal", className)}>{children}</th>;
}
export function Td({ children, className }: { children?: React.ReactNode; className?: string }) {
  return <td className={cn("px-4 py-3 align-middle", className)}>{children}</td>;
}
export function Tr({ children, className }: { children: React.ReactNode; className?: string }) {
  return <tr className={cn("border-t border-white/[0.06] transition-colors hover:bg-white/[0.025]", className)}>{children}</tr>;
}

/* ------------------------------ buttons ------------------------------ */
export function SaveButton({ saving, children = "儲存" }: { saving: boolean; children?: React.ReactNode }) {
  return (
    <Button type="submit" disabled={saving}>
      {saving ? <Loader2 size={15} className="animate-spin" /> : <Check size={15} strokeWidth={3} />}
      {children}
    </Button>
  );
}

export function ConfirmDelete({ onConfirm, label = "刪除" }: { onConfirm: () => void; label?: string }) {
  const [arm, setArm] = useState(false);
  useEffect(() => {
    if (!arm) return;
    const t = setTimeout(() => setArm(false), 3000);
    return () => clearTimeout(t);
  }, [arm]);
  return arm ? (
    <Button variant="danger" size="sm" onClick={onConfirm}>
      確定{label}？
    </Button>
  ) : (
    <Button variant="ghost" size="sm" onClick={() => setArm(true)}>
      <Trash2 size={13} />
      {label}
    </Button>
  );
}

export function LinkBack({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link href={href} className="mb-4 inline-flex items-center gap-1.5 text-[13px] text-fg-3 hover:text-fg">
      ← {children}
    </Link>
  );
}

export function slugify(s: string) {
  return s
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/[\s_]+/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 48);
}

/* ------------------------------ editor helpers ------------------------------ */
/** Warns before the tab is closed or reloaded while there are unsaved changes. */
/**
 * Whether an editor on screen has unsaved changes.
 *
 * `beforeunload` only covers closing or reloading the tab. The editors live on
 * their own routes with the console's sidebar next to them, so the likelier way
 * to lose a half-written lesson is clicking another sidebar link — a client-side
 * navigation that fires no browser event. AdminShell asks this before letting a
 * link through, which is why the flag lives outside React.
 */
let editorDirty = false;
export function isEditorDirty() {
  return editorDirty;
}

export function useUnsavedGuard(dirty: boolean) {
  useEffect(() => {
    editorDirty = dirty;
    if (!dirty) return;
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
    };
    window.addEventListener("beforeunload", handler);
    return () => {
      editorDirty = false;
      window.removeEventListener("beforeunload", handler);
    };
  }, [dirty]);
}

/** Ctrl/Cmd+S submits the editor form. */
export function useSaveShortcut(onSave: () => void) {
  const fire = useEffectEvent(onSave);
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "s") {
        e.preventDefault();
        fire();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);
}

export function UnsavedPill({ dirty }: { dirty: boolean }) {
  if (!dirty) return null;
  return (
    <span className="inline-flex items-center gap-1.5 self-center rounded-md border border-amber/40 bg-amber/10 px-2 py-1 font-mono text-[10.5px] tracking-wider text-amber">
      <span className="h-1.5 w-1.5 rounded-full bg-amber" />
      未儲存 · Ctrl+S
    </span>
  );
}

/* ------------------------------ drawer ------------------------------ */
export function Drawer({
  open,
  onClose,
  title,
  children,
  footer,
  width = 520,
}: {
  open: boolean;
  onClose: () => void;
  title: React.ReactNode;
  children: React.ReactNode;
  footer?: React.ReactNode;
  width?: number;
}) {
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[90] flex justify-end bg-bg-0/70 backdrop-blur-sm" onClick={onClose} role="presentation">
      <aside
        className="flex h-full w-full flex-col border-l border-white/[0.08] bg-bg-1 shadow-[-30px_0_80px_-30px_rgba(0,0,0,0.9)]"
        style={{ maxWidth: width, animation: "drawer-in .22s ease-out" }}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        <header className="flex items-center justify-between gap-4 border-b border-white/[0.06] px-6 py-4">
          <div className="min-w-0 text-[16px] font-extrabold">{title}</div>
          <button type="button" onClick={onClose} className="rounded-md p-1.5 text-fg-3 hover:bg-white/[0.06] hover:text-fg" aria-label="關閉">
            <X size={18} />
          </button>
        </header>
        <div className="min-h-0 flex-1 overflow-y-auto px-6 py-5">{children}</div>
        {footer ? <footer className="border-t border-white/[0.06] px-6 py-4">{footer}</footer> : null}
      </aside>
    </div>
  );
}
