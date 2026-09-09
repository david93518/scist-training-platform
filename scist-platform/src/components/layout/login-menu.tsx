"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { X, LogOut, LayoutDashboard, ShieldCheck, Zap, ChevronDown, Loader2, Lock } from "lucide-react";
import { Button, HexAvatar, buttonClass } from "@/components/ui/primitives";
import { SCHOOLS } from "@/data/schools";
import { useProgress, useHydrated, refreshProfile, type Role } from "@/store/progress";
import { api } from "@/lib/api";
import { rankFor } from "@/lib/xp";
import { useRanks, useSettings } from "@/components/settings-provider";
import { cn, formatNumber } from "@/lib/utils";

const DEV = process.env.NODE_ENV !== "production";
const DISCORD_READY = process.env.NEXT_PUBLIC_DISCORD_LOGIN === "1";

const ROLES: { id: Role; label: string; hint: string }[] = [
  { id: "student", label: "學員", hint: "看課、解題、發問" },
  { id: "ta", label: "助教", hint: "可回答問題、看學員進度" },
  { id: "instructor", label: "講師", hint: "可上架課程與題目" },
  { id: "admin", label: "管理員", hint: "全部權限，含設定與角色" },
];

const ROLE_LABEL: Record<Role, string> = { student: "學員", ta: "助教", instructor: "講師", admin: "管理員" };

/**
 * Where the dialog was asked to send the user afterwards. The admin gate
 * (src/proxy.ts) redirects to /?login=admin&next=/admin/... ; a plain
 * /?login=1 just opens the dialog.
 */
interface LoginIntent {
  open: boolean;
  /** "admin" when the admin gate sent the user here */
  reason: string | null;
  /** same-origin path to go to after a successful login */
  next: string | null;
}

function readIntent(): LoginIntent {
  if (typeof window === "undefined") return { open: false, reason: null, next: null };
  const params = new URLSearchParams(window.location.search);
  if (!params.has("login")) return { open: false, reason: null, next: null };
  const rawNext = params.get("next");
  const next = rawNext && rawNext.startsWith("/") && !rawNext.startsWith("//") ? rawNext : null;
  const reason = params.get("login");
  return { open: true, reason: reason === "admin" || (next?.startsWith("/admin") ?? false) ? "admin" : reason, next };
}

/** Drops ?login and ?next from the address bar so a refresh does not reopen the dialog. */
function clearIntentFromUrl() {
  if (typeof window === "undefined") return;
  const url = new URL(window.location.href);
  if (!url.searchParams.has("login") && !url.searchParams.has("next")) return;
  url.searchParams.delete("login");
  url.searchParams.delete("next");
  window.history.replaceState(window.history.state, "", url.pathname + (url.search || "") + url.hash);
}

function IconDiscord({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M20.3 4.5A19 19 0 0 0 15.6 3l-.24.44a13 13 0 0 1 4.2 2.1 18.7 18.7 0 0 0-15.1 0 13 13 0 0 1 4.2-2.1L8.4 3a19 19 0 0 0-4.7 1.5C.9 8.6.1 12.6.5 16.5a19 19 0 0 0 5.7 2.9l.9-1.3a12 12 0 0 1-1.9-.9l.4-.3a13.5 13.5 0 0 0 12.8 0l.4.3a12 12 0 0 1-1.9.9l.9 1.3a19 19 0 0 0 5.7-2.9c.5-4.5-.8-8.5-3.2-12ZM8.4 14.3c-1.1 0-2-1-2-2.3s.9-2.3 2-2.3 2 1 2 2.3-.9 2.3-2 2.3Zm7.2 0c-1.1 0-2-1-2-2.3s.9-2.3 2-2.3 2 1 2 2.3-.9 2.3-2 2.3Z" />
    </svg>
  );
}

/**
 * Login dialog. Discord is the real login (GET /api/auth/discord). Outside
 * production a second section signs a development session with any handle
 * and role through POST /api/auth/dev, so every role can be exercised.
 *
 * `next` (from the admin gate) makes a successful login navigate there
 * instead of just closing the dialog.
 */
export function LoginDialog({ open, onClose, next, reason }: { open: boolean; onClose: () => void; next?: string | null; reason?: string | null }) {
  if (!open) return null;
  return <LoginDialogBody onClose={onClose} next={next ?? null} reason={reason ?? null} />;
}

function LoginDialogBody({ onClose, next, reason }: { onClose: () => void; next: string | null; reason: string | null }) {
  const siteName = useSettings().site.name;
  const handle = useProgress((s) => s.handle);
  const schoolId = useProgress((s) => s.schoolId);
  const role = useProgress((s) => s.role);
  const authenticated = useProgress((s) => s.authenticated);
  const logout = useProgress((s) => s.logout);

  const forAdmin = reason === "admin";
  const canAdmin = role === "instructor" || role === "admin";
  // sent here by the admin gate while already signed in: the role is the problem, not the session
  const roleTooLow = forAdmin && authenticated && !canAdmin;

  // mounted fresh on every open, so initial state can come straight from the store.
  // Coming from the admin gate, the dev form preselects admin so the next visit passes.
  const [draft, setDraft] = useState(() => ({
    handle: handle === "guest" ? "" : handle,
    schoolId,
    role: (forAdmin && !canAdmin ? "admin" : role) as Role,
  }));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const discordHref = next ? "/api/auth/discord?next=" + encodeURIComponent(next) : "/api/auth/discord";

  const devLogin = async () => {
    setBusy(true);
    setError(null);
    try {
      await api("/api/auth/dev", { body: { handle: draft.handle.trim(), schoolId: draft.schoolId, role: draft.role } });
      await refreshProfile(true);
      if (next) {
        // full navigation: the admin gate reads the new cookie on the way in
        window.location.assign(next);
        return;
      }
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "登入失敗");
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] grid place-items-center bg-bg-0/70 p-4 backdrop-blur-sm" onClick={onClose}>
      <div className="card w-full max-w-md overflow-hidden" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
        <div className="flex items-center justify-between border-b border-white/[0.06] px-6 py-4">
          <div className="text-[16px] font-extrabold">登入 {siteName}</div>
          <button onClick={onClose} className="text-fg-3 hover:text-fg" aria-label="關閉">
            <X size={18} />
          </button>
        </div>

        <div className="p-6">
          {forAdmin ? (
            <div className="mb-5 flex items-start gap-3 rounded-xl border border-amber/40 bg-amber/[0.07] px-4 py-3">
              <Lock size={15} className="mt-0.5 shrink-0 text-amber" />
              <p className="text-[13px] leading-relaxed text-fg-2">
                {roleTooLow ? (
                  <>
                    你目前是 <span className="font-mono text-fg">{handle}</span>（{ROLE_LABEL[role]}），後台需要講師或管理員權限。
                    {DEV ? "開發環境可以在下面直接切換身分；" : ""}正式站請管理員到「學員與角色」指派。
                  </>
                ) : (
                  <>
                    後台需要講師或管理員權限。登入後會直接帶你回{" "}
                    <span className="font-mono text-fg">{next ?? "/admin"}</span>。
                  </>
                )}
              </p>
            </div>
          ) : null}

          <a
            href={discordHref}
            className={buttonClass("primary", "lg", "w-full bg-[linear-gradient(135deg,#7289da,#5865f2)] text-white shadow-[0_10px_30px_-10px_rgba(88,101,242,0.8)]")}
            onClick={(e) => {
              if (!DISCORD_READY) {
                e.preventDefault();
                setError("Discord 登入尚未設定。填好 DISCORD_CLIENT_ID / SECRET 並設定 NEXT_PUBLIC_DISCORD_LOGIN=1 後這顆按鈕就會生效，流程見 docs/INTEGRATIONS.md。");
              }
            }}
          >
            <IconDiscord size={18} />
            用 Discord 登入
          </a>
          <p className="mt-2 text-center font-mono text-[11px] text-fg-3">
            正式站唯一的登入方式。第一次登入自動建立帳號，進度跨裝置同步。
          </p>

          {DEV ? (
            <>
              <div className="my-6 flex items-center gap-3">
                <span className="h-px flex-1 bg-white/[0.08]" />
                <span className="mono-label">開發用登入</span>
                <span className="h-px flex-1 bg-white/[0.08]" />
              </div>

              <div className="flex flex-col gap-3">
                <label className="flex flex-col gap-1.5">
                  <span className="mono-label">帳號名稱</span>
                  <input
                    value={draft.handle}
                    onChange={(e) => setDraft({ ...draft, handle: e.target.value })}
                    placeholder="例如 n0ir"
                    maxLength={20}
                    autoFocus
                    className="h-10 rounded-lg border border-white/[0.08] bg-bg-0 px-3 font-mono text-[14px] outline-none focus:border-accent/50"
                  />
                </label>
                <label className="flex flex-col gap-1.5">
                  <span className="mono-label">學校</span>
                  <select
                    value={draft.schoolId}
                    onChange={(e) => setDraft({ ...draft, schoolId: e.target.value })}
                    className="h-10 rounded-lg border border-white/[0.08] bg-bg-0 px-3 text-[14px] outline-none"
                  >
                    {SCHOOLS.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                </label>
                <div>
                  <span className="mono-label">角色</span>
                  <div className="mt-1.5 grid grid-cols-2 gap-2">
                    {ROLES.map((r) => (
                      <button
                        key={r.id}
                        type="button"
                        onClick={() => setDraft({ ...draft, role: r.id })}
                        className={cn(
                          "rounded-lg border px-3 py-2 text-left transition-colors",
                          draft.role === r.id ? "border-accent/60 bg-accent/10" : "border-white/[0.08] bg-white/[0.02] hover:border-white/20",
                        )}
                      >
                        <div className="text-[13px] font-bold">{r.label}</div>
                        <div className="text-[11px] text-fg-3">{r.hint}</div>
                      </button>
                    ))}
                  </div>
                </div>
                <div className="mt-2 flex gap-2">
                  <Button className="flex-1" disabled={!draft.handle.trim() || busy} onClick={devLogin}>
                    {busy ? <Loader2 size={14} className="animate-spin" /> : null}
                    {next ? "登入並前往" + (next.startsWith("/admin") ? "後台" : "") : "以此身分登入"}
                  </Button>
                  {authenticated ? (
                    <Button
                      variant="outline"
                      onClick={async () => {
                        await logout();
                        onClose();
                      }}
                    >
                      <LogOut size={14} />
                      登出
                    </Button>
                  ) : null}
                </div>
                <p className="font-mono text-[11px] leading-relaxed text-fg-3">
                  開發用登入會在資料庫建立真的帳號與 session，只在開發環境存在。正式站的角色由 Discord 登入後在後台「學員與角色」指派。
                </p>
              </div>
            </>
          ) : authenticated ? (
            <Button
              variant="outline"
              className="mt-6 w-full"
              onClick={async () => {
                await logout();
                onClose();
              }}
            >
              <LogOut size={14} />
              登出
            </Button>
          ) : null}

          {error ? <p className="mt-4 rounded-lg border border-red/40 bg-red/10 px-3 py-2 text-[12.5px] leading-relaxed text-fg-2">{error}</p> : null}
        </div>
      </div>
    </div>
  );
}

/** Header control: XP pill + avatar menu, or a login button for guests. */
export function LoginMenu() {
  const hydrated = useHydrated();
  const handle = useProgress((s) => s.handle);
  const role = useProgress((s) => s.role);
  const xp = useProgress((s) => s.xp);
  const authenticated = useProgress((s) => s.authenticated);
  const logout = useProgress((s) => s.logout);
  // ?login=… (the admin gate sends people here) opens the dialog on arrival
  const [intent, setIntent] = useState<LoginIntent>(readIntent);
  const [menu, setMenu] = useState(false);
  const ranks = useRanks();
  const rank = rankFor(xp, ranks);
  const canAdmin = role === "instructor" || role === "admin";

  const close = () => {
    setIntent({ open: false, reason: null, next: null });
    clearIntentFromUrl();
  };
  const openPlain = () => setIntent({ open: true, reason: null, next: null });

  if (!hydrated) return <span className="h-10 w-24" />;

  const dialog = <LoginDialog open={intent.open} onClose={close} next={intent.next} reason={intent.reason} />;

  if (!authenticated) {
    return (
      <>
        <button onClick={openPlain} className={buttonClass("outline", "sm")}>
          登入
        </button>
        {dialog}
      </>
    );
  }

  return (
    <div className="relative">
      <button
        onClick={() => setMenu((v) => !v)}
        className="flex items-center gap-2.5 rounded-xl border border-white/10 bg-white/[0.04] py-1.5 pl-1.5 pr-3 transition-colors hover:border-accent/50"
        aria-haspopup="menu"
        aria-expanded={menu}
      >
        <HexAvatar seed={handle} size={26} />
        <span className="hidden font-mono text-[13px] font-bold sm:inline">{handle}</span>
        <span className="hidden items-center gap-1 font-mono text-[12px] tabular-nums text-accent sm:flex">
          <Zap size={11} />
          {formatNumber(xp)}
        </span>
        <ChevronDown size={13} className="text-fg-3" />
      </button>

      {menu ? (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setMenu(false)} />
          <div className="card absolute right-0 top-[calc(100%+8px)] z-50 w-64 overflow-hidden p-1.5" role="menu">
            <div className="px-3 py-2.5">
              <div className="font-mono text-[13px] font-bold">{handle}</div>
              <div className="text-[11.5px]" style={{ color: rank.color }}>
                {rank.name} · {formatNumber(xp)} XP
              </div>
            </div>
            <div className="my-1 h-px bg-white/[0.06]" />
            <Link href="/dashboard" onClick={() => setMenu(false)} className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-[13px] hover:bg-white/[0.05]">
              <LayoutDashboard size={14} className="text-fg-3" />
              我的進度
            </Link>
            {canAdmin ? (
              <Link href="/admin" onClick={() => setMenu(false)} className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-[13px] hover:bg-white/[0.05]">
                <ShieldCheck size={14} className="text-accent" />
                後台管理
              </Link>
            ) : null}
            {DEV ? (
              <button
                onClick={() => {
                  setMenu(false);
                  openPlain();
                }}
                className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-[13px] hover:bg-white/[0.05]"
              >
                <HexAvatar seed="switch" size={14} />
                切換身分
              </button>
            ) : null}
            <div className="my-1 h-px bg-white/[0.06]" />
            <button
              onClick={() => {
                setMenu(false);
                void logout();
              }}
              className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-[13px] text-fg-2 hover:bg-white/[0.05]"
            >
              <LogOut size={14} />
              登出
            </button>
          </div>
        </>
      ) : null}
      {dialog}
    </div>
  );
}
